// ZIP bundle builder for Phase 1 exports.
// Output structure:
//   /images/hero.{png|jpg}
//   /copy_en.md
//   /copy_ar.md (when bilingual or ar)
//   /brief.md
//   /manifest.json

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import JSZip from "jszip";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { uploadBuffer } from "@/services/r2";
import { prisma } from "@/lib/prisma";

const EXPORT_FOLDER = "ad-studio-exports";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const FETCH_IMAGE_TIMEOUT_MS = 15_000;
const FETCH_IMAGE_MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard cap per image

// Allowlist of hosts the export ZIP is permitted to fetch images from.
// All system-generated heroImageUrl values land on R2 (own bucket) or were
// imported from menu source images. Anything else is blocked.
export function isAllowedImageHost(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  // Compare against the configured R2 public host. If a custom domain is used,
  // accept it; if not, accept the cloudflarestorage subdomain too.
  const r2PublicHost = (() => {
    try {
      return new URL(env.R2_PUBLIC_URL).host.toLowerCase();
    } catch {
      return null;
    }
  })();
  const host = parsed.host.toLowerCase();
  return Boolean(r2PublicHost && (host === r2PublicHost || host.endsWith(".r2.cloudflarestorage.com")));
}

let signClient: S3Client | null = null;
function getSignClient() {
  if (signClient) return signClient;
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new ApiError("R2 credentials are not configured", 503);
  }
  signClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return signClient;
}

export interface ExportInput {
  projectId: string;
  restaurantId: string;
  restaurantName: string;
  projectName: string;
  campaignType: string;
  countries: string[];
  cuisines: string[];
  targetPlatforms: string[];
  budgetAed: number;
  variants: Array<{
    variant: number;
    headline: string;
    primaryText: string;
    ctaText: string;
    headlineAr?: string | null;
    primaryTextAr?: string | null;
    ctaTextAr?: string | null;
    archetypeId: string;
    hookId?: string | null;
    ctaId?: string | null;
    heroImageUrl?: string | null;
  }>;
}

export interface ExportResult {
  fileKey: string;
  fileUrl: string;
  signedUrl: string;
  expiresAt: Date;
  fileSizeBytes: number;
  manifest: Record<string, unknown>;
}

/**
 * Build and upload a bundle ZIP. Returns a signed URL for download.
 */
export async function buildAndUploadBundle(input: ExportInput): Promise<ExportResult> {
  if (input.variants.length === 0) {
    throw new ApiError("Cannot export an empty project", 400);
  }

  const zip = new JSZip();

  // Brief
  zip.file("brief.md", buildBriefMarkdown(input));

  // Copy
  zip.file("copy_en.md", buildCopyMarkdown(input, "en"));
  if (input.variants.some((v) => v.headlineAr || v.primaryTextAr || v.ctaTextAr)) {
    zip.file("copy_ar.md", buildCopyMarkdown(input, "ar"));
  }

  // Images — fetch + add. Skip ones that fail to fetch (don't kill the whole export).
  const imagesFolder = zip.folder("images")!;
  for (const v of input.variants) {
    if (!v.heroImageUrl) continue;
    try {
      const buf = await fetchImage(v.heroImageUrl);
      const ext = inferImageExt(v.heroImageUrl, buf);
      imagesFolder.file(`variant_${v.variant}_hero.${ext}`, buf);
    } catch (error) {
      console.warn(`[ad-studio export] image fetch failed for variant ${v.variant}`, error);
    }
  }

  // Manifest — stable JSON for downstream automation (Phase 3 builds on this)
  const manifest = buildManifest(input);
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Generate
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const fileSizeBytes = buffer.length;
  const fileKey = `${EXPORT_FOLDER}/${input.restaurantId}/${input.projectId}/${Date.now()}.zip`;
  await uploadBuffer({ buffer, contentType: "application/zip", key: fileKey });

  // Sign for download
  const signedUrl = await getSignedUrl(
    getSignClient(),
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: fileKey }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);

  // Persist export record. Store the canonical R2 URL (no signature) — sign on
  // demand for downloads to avoid leaking time-limited credentials in DB rows.
  const canonicalUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${fileKey}`;
  await prisma.adExport.create({
    data: {
      projectId: input.projectId,
      format: "creative_zip",
      fileUrl: canonicalUrl,
      fileKey,
      fileSizeBytes,
      manifestJson: manifest,
      expiresAt,
    },
  });

  return {
    fileKey,
    fileUrl: `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${fileKey}`,
    signedUrl,
    expiresAt,
    fileSizeBytes,
    manifest,
  };
}

function buildBriefMarkdown(input: ExportInput): string {
  return [
    `# ${input.projectName}`,
    "",
    `**Restaurant:** ${input.restaurantName}`,
    `**Campaign type:** ${input.campaignType}`,
    `**Countries:** ${input.countries.join(", ")}`,
    `**Cuisines:** ${input.cuisines.join(", ")}`,
    `**Platforms:** ${input.targetPlatforms.join(", ")}`,
    `**Budget:** AED ${input.budgetAed.toLocaleString()}`,
    "",
    `## Variants generated`,
    "",
    ...input.variants.map((v) => `- Variant ${v.variant}: archetype \`${v.archetypeId}\`, hook \`${v.hookId ?? "n/a"}\`, CTA \`${v.ctaId ?? "n/a"}\``),
    "",
    `Generated by Bustan Ad Creative Studio.`,
  ].join("\n");
}

function buildCopyMarkdown(input: ExportInput, language: "en" | "ar"): string {
  const lines: string[] = [`# Copy (${language.toUpperCase()})`, "", `## ${input.projectName}`, ""];
  for (const v of input.variants) {
    lines.push(`### Variant ${v.variant}`);
    if (language === "en") {
      lines.push(`**Headline:** ${v.headline}`);
      lines.push(`**Primary text:** ${v.primaryText}`);
      lines.push(`**CTA:** ${v.ctaText}`);
    } else {
      if (v.headlineAr) lines.push(`**العنوان:** ${v.headlineAr}`);
      if (v.primaryTextAr) lines.push(`**النص:** ${v.primaryTextAr}`);
      if (v.ctaTextAr) lines.push(`**زر الإجراء:** ${v.ctaTextAr}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildManifest(input: ExportInput) {
  return {
    bustan: { generator: "ad-studio", phase: 1, kind: "creative_zip" },
    project: {
      id: input.projectId,
      name: input.projectName,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      campaignType: input.campaignType,
      countries: input.countries,
      cuisines: input.cuisines,
      targetPlatforms: input.targetPlatforms,
      budgetAed: input.budgetAed,
    },
    variants: input.variants.map((v) => ({
      variant: v.variant,
      archetypeId: v.archetypeId,
      hookId: v.hookId,
      ctaId: v.ctaId,
      heroImage: v.heroImageUrl ? `images/variant_${v.variant}_hero.*` : null,
      copy: {
        en: { headline: v.headline, primaryText: v.primaryText, ctaText: v.ctaText },
        ar:
          v.headlineAr || v.primaryTextAr || v.ctaTextAr
            ? { headline: v.headlineAr ?? null, primaryText: v.primaryTextAr ?? null, ctaText: v.ctaTextAr ?? null }
            : null,
      },
    })),
    createdAt: new Date().toISOString(),
  };
}

async function fetchImage(url: string): Promise<Buffer> {
  if (!isAllowedImageHost(url)) {
    throw new Error(`Refused to fetch image from disallowed host: ${url}`);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${url}: ${response.status}`);
  }
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > 0 && declaredLength > FETCH_IMAGE_MAX_BYTES) {
    throw new Error(`Image exceeds size cap (${declaredLength} bytes)`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > FETCH_IMAGE_MAX_BYTES) {
    throw new Error(`Image exceeds size cap (${arrayBuffer.byteLength} bytes)`);
  }
  return Buffer.from(arrayBuffer);
}

function inferImageExt(url: string, buf: Buffer): "jpg" | "png" | "webp" {
  // PNG magic bytes
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // WebP
  if (buf.length >= 12 && buf.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  // JPEG default
  if (url.toLowerCase().endsWith(".png")) return "png";
  if (url.toLowerCase().endsWith(".webp")) return "webp";
  return "jpg";
}
