// Meta-ready export bundle orchestrator.
//
// Output ZIP shape:
//   meta-campaign.json
//   audiences/<recipe>.json + README.md
//   creatives/variant-N/{hero-9x16,4x5,1x1,191x1}.jpg + creative.json
//   tracking/meta-pixel-events.md
//   upload-guide.md
//   manifest.json

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import JSZip from "jszip";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/services/r2";
import { isAllowedImageHost } from "@/services/ad-studio-ai/export-bundle";
import {
  campaignArchetypes,
  type CampaignType,
  type CountryCode,
  type FunnelStage,
} from "@/services/ad-studio";
import { kbMeta } from "@/services/ad-studio";
import { buildMetaImageVariantsFromUrl, META_IMAGE_FILENAMES } from "./image-resizer";
import { buildMetaCampaignJson } from "./campaign-json-builder";
import { buildSavedAudienceFiles } from "./audience-builder";
import { validateMetaBundle, hasBlockingErrors, type ValidationIssue } from "./validator";
import { buildUploadGuide, buildPixelEventsGuide } from "./upload-guide-builder";

const EXPORT_FOLDER = "ad-studio-meta-exports";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

export interface MetaExportInput {
  projectId: string;
  restaurantId: string;
  restaurantName: string;
  projectName: string;
  campaignType: CampaignType;
  goal: FunnelStage;
  countries: CountryCode[];
  cuisines: string[];
  budgetAed: number;
  durationWeeks: number | null;
  destinationUrl: string;
  pageNameHint: string;
  pixelIdHint?: string;
  creatives: Array<{
    id: string;
    variant: number;
    archetypeId: string;
    hookId: string | null;
    ctaId: string | null;
    headline: string;
    primaryText: string;
    ctaText: string;
    headlineAr: string | null;
    primaryTextAr: string | null;
    ctaTextAr: string | null;
    heroImageUrl: string | null;
  }>;
}

export interface MetaExportResult {
  fileKey: string;
  signedUrl: string;
  expiresAt: Date;
  fileSizeBytes: number;
  validationIssues: ValidationIssue[];
  manifest: Record<string, unknown>;
}

/**
 * Build a Meta-ready export ZIP for a project, upload to R2, persist an
 * AdExport row, and return a signed URL for download. Returns validation
 * issues so the UI can warn about character-limit overruns / missing images.
 *
 * Throws ApiError(422) when blocking validation errors prevent a meaningful
 * export (e.g. zero approved creatives, no destination URL).
 */
export async function buildMetaExport(input: MetaExportInput): Promise<MetaExportResult> {
  // 1) Pre-flight validation — fail fast on blocking errors.
  const validatorInput = {
    destinationUrl: input.destinationUrl,
    creatives: input.creatives.map((c) => ({
      variant: c.variant,
      headline: c.headline,
      primaryText: c.primaryText,
      ctaText: c.ctaText,
      headlineAr: c.headlineAr,
      primaryTextAr: c.primaryTextAr,
      ctaTextAr: c.ctaTextAr,
      heroImageUrl: c.heroImageUrl,
    })),
  };
  const issues = validateMetaBundle(validatorInput);
  if (hasBlockingErrors(issues)) {
    const errs = issues
      .filter((i) => i.severity === "error")
      .slice(0, 3)
      .map((i) => i.message)
      .join(" | ");
    throw new ApiError(`Cannot export: ${errs}`, 422);
  }

  // 2) Resize each variant's hero into 4 Meta aspect ratios.
  // Sequential per variant (sharp is fast; cumulative cost dominated by network fetch).
  const zip = new JSZip();
  const creativesFolder = zip.folder("creatives")!;
  const exportableCreatives = input.creatives.filter((c) => c.heroImageUrl);

  for (const c of exportableCreatives) {
    if (!c.heroImageUrl) continue;
    const variantFolder = creativesFolder.folder(`variant-${c.variant}`)!;
    try {
      const variants = await buildMetaImageVariantsFromUrl(c.heroImageUrl, { isAllowedHost: isAllowedImageHost });
      variantFolder.file(META_IMAGE_FILENAMES.vertical_9_16, variants.vertical_9_16);
      variantFolder.file(META_IMAGE_FILENAMES.vertical_4_5, variants.vertical_4_5);
      variantFolder.file(META_IMAGE_FILENAMES.square_1_1, variants.square_1_1);
      variantFolder.file(META_IMAGE_FILENAMES.landscape_1_91_1, variants.landscape_1_91_1);
    } catch (error) {
      // Per-variant failure shouldn't kill the whole export — record the
      // issue and continue. The user can retry image regen later.
      issues.push({
        severity: "warning",
        scope: "creative",
        field: `variant ${c.variant} image resize`,
        message: error instanceof Error ? error.message : "Image resize failed",
      });
      continue;
    }

    // Per-variant creative.json with the copy + bilingual + CTA + archetype trace
    variantFolder.file(
      "creative.json",
      JSON.stringify(
        {
          variant: c.variant,
          archetypeId: c.archetypeId,
          hookId: c.hookId,
          ctaId: c.ctaId,
          copy: {
            en: { headline: c.headline, primary_text: c.primaryText, cta_text: c.ctaText },
            ...(c.headlineAr
              ? {
                  ar: {
                    headline: c.headlineAr,
                    primary_text: c.primaryTextAr ?? "",
                    cta_text: c.ctaTextAr ?? c.ctaText,
                  },
                }
              : {}),
          },
          images: {
            "9:16": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.vertical_9_16}`,
            "4:5": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.vertical_4_5}`,
            "1:1": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.square_1_1}`,
            "1.91:1": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.landscape_1_91_1}`,
          },
          // Quick-upload hint: in Ads Manager, uploading a single 1:1 image
          // lets Meta auto-fit feeds, stories, and reels. Use the others
          // when you want pixel-perfect control of each placement.
          recommended_for_quick_upload: `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.square_1_1}`,
        },
        null,
        2
      )
    );
  }

  // 3) Build campaign.json (only for variants we successfully wrote)
  const writtenCreatives = exportableCreatives.filter((c) => {
    const folder = creativesFolder.folder(`variant-${c.variant}`);
    return folder && Object.keys(folder.files).length > 0;
  });
  if (writtenCreatives.length === 0) {
    // 502 (not 422): this is an upstream R2/Sharp failure the user can't fix
    // by editing project fields. 422 is reserved for pre-flight validation.
    throw new ApiError("No variants survived the export pipeline — all images failed to fetch/resize.", 502);
  }

  const campaignJson = buildMetaCampaignJson({
    project: {
      id: input.projectId,
      name: input.projectName,
      campaignType: input.campaignType,
      goal: input.goal,
      countries: input.countries,
      budgetAed: input.budgetAed,
      durationWeeks: input.durationWeeks,
    },
    creatives: writtenCreatives.map((c) => ({
      id: c.id,
      variant: c.variant,
      archetypeId: c.archetypeId,
      hookId: c.hookId,
      ctaId: c.ctaId,
      headline: c.headline,
      primaryText: c.primaryText,
      ctaText: c.ctaText,
      headlineAr: c.headlineAr,
      primaryTextAr: c.primaryTextAr,
      ctaTextAr: c.ctaTextAr,
      heroImageUrl: c.heroImageUrl!,
    })),
    destinationUrl: input.destinationUrl,
    pageNameHint: input.pageNameHint,
    pixelIdHint: input.pixelIdHint,
    kbVersion: kbMeta.version,
  });
  zip.file("meta-campaign.json", JSON.stringify(campaignJson, null, 2));

  // 4) Audience saved-audience descriptors
  const archetype = campaignArchetypes.find((c) => c.id === input.campaignType);
  const audienceFiles = buildSavedAudienceFiles({
    recipeIds: archetype?.audienceRecipeIds ?? [],
    countries: input.countries,
  });
  for (const f of audienceFiles) {
    zip.file(f.filename, f.content);
  }

  // 5) Upload guide + Pixel events doc
  zip.file(
    "upload-guide.md",
    buildUploadGuide({
      projectName: input.projectName,
      restaurantName: input.restaurantName,
      campaignType: input.campaignType,
      countries: input.countries,
      budgetAed: input.budgetAed,
      durationWeeks: input.durationWeeks,
      variantCount: writtenCreatives.length,
      destinationUrl: input.destinationUrl,
    })
  );
  zip.folder("tracking")!.file("meta-pixel-events.md", buildPixelEventsGuide());

  // 6) Manifest.json — index of everything in the bundle
  const failedVariants = exportableCreatives
    .filter((c) => !writtenCreatives.includes(c))
    .map((c) => c.variant);
  const manifest = {
    bustan: {
      generator: "ad-studio",
      phase: "2A",
      kind: "meta_bundle",
      kb_version: kbMeta.version,
    },
    project: {
      id: input.projectId,
      name: input.projectName,
      restaurantName: input.restaurantName,
      campaignType: input.campaignType,
      goal: input.goal,
      countries: input.countries,
      cuisines: input.cuisines,
      budgetAed: input.budgetAed,
      durationWeeks: input.durationWeeks,
      destinationUrl: input.destinationUrl,
    },
    /** Surface a top-level partial-success signal so the UI can banner. */
    partial:
      failedVariants.length > 0
        ? {
            requested: exportableCreatives.length,
            written: writtenCreatives.length,
            failedVariants,
          }
        : null,
    files: {
      campaign: "meta-campaign.json",
      audiences: audienceFiles.map((f) => f.filename),
      creatives: writtenCreatives.map((c) => ({
        variant: c.variant,
        archetypeId: c.archetypeId,
        folder: `creatives/variant-${c.variant}/`,
        creativeJson: `creatives/variant-${c.variant}/creative.json`,
        images: {
          "9:16": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.vertical_9_16}`,
          "4:5": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.vertical_4_5}`,
          "1:1": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.square_1_1}`,
          "1.91:1": `creatives/variant-${c.variant}/${META_IMAGE_FILENAMES.landscape_1_91_1}`,
        },
      })),
      uploadGuide: "upload-guide.md",
      tracking: "tracking/meta-pixel-events.md",
    },
    validationIssues: issues,
    createdAt: new Date().toISOString(),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 7) Generate ZIP, upload to R2
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const fileSizeBytes = buffer.length;
  // Hard size cap. Worst-case (6 variants × 4 ratios × ~250KB) is well under 50MB
  // — anything larger means something went wrong (e.g. uncompressible source).
  const MAX_BUNDLE_BYTES = 50 * 1024 * 1024;
  if (fileSizeBytes > MAX_BUNDLE_BYTES) {
    throw new ApiError(
      `Generated bundle exceeds size cap (${Math.round(fileSizeBytes / 1024 / 1024)}MB > 50MB).`,
      413
    );
  }
  const fileKey = `${EXPORT_FOLDER}/${input.restaurantId}/${input.projectId}/${Date.now()}.zip`;
  await uploadBuffer({ buffer, contentType: "application/zip", key: fileKey });

  // 8) Signed download URL
  const signedUrl = await getSignedUrl(
    getSignClient(),
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: fileKey }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);

  // 9) Persist AdExport — store canonical URL only (security review M11).
  const canonicalUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${fileKey}`;
  await prisma.adExport.create({
    data: {
      projectId: input.projectId,
      format: "meta_bundle",
      fileUrl: canonicalUrl,
      fileKey,
      fileSizeBytes,
      manifestJson: manifest as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });

  return {
    fileKey,
    signedUrl,
    expiresAt,
    fileSizeBytes,
    validationIssues: issues,
    manifest,
  };
}
