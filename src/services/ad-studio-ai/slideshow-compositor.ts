// Sabt Pack slideshow compositor — slot 1 of the weekly pack.
//
// Builds 5 platform-ready frames at 1080×1350 (4:5) for TikTok Photo Mode and
// Instagram Carousel from the restaurant's existing menu photos, with a
// short SVG text overlay per frame. No AI image generation — pure sharp
// pipeline against owner-uploaded dish photography. Cost: $0.
//
// Storage: each frame uploads to R2 as an independent object so the review
// surface can swipe-render them and the owner exports per-platform.

import sharp from "sharp";
import { ApiError } from "@/lib/errors";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/services/r2";

export interface SlideshowFrameInput {
  /** MenuItem id whose primary image is the visual for this frame. */
  menuItemId: string;
  /** Short hook the overlay strip will render (≤32 chars wraps to 2 lines). */
  headline: string;
}

export interface BuildSlideshowOptions {
  restaurantId: string;
  frames: SlideshowFrameInput[];
  /** Optional accent color (hex) for the bottom band; defaults to a near-black
   *  semi-transparent overlay so it works against any photo. */
  accentColor?: string;
}

export interface BuildSlideshowResult {
  /** R2 public URLs in render order. */
  frameUrls: string[];
  /** True when ≥5 frames rendered with real menu photos. False when we had to
   *  downgrade (fewer photos available) — caller may decide to skip slot 1. */
  fullSlideshow: boolean;
  /** Per-frame status for debugging / failure surfacing. */
  perFrame: Array<{ menuItemId: string; ok: boolean; reason?: string }>;
}

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;
const OVERLAY_HEIGHT = 360; // bottom band height in pixels
const SLIDESHOW_FOLDER = "ad-studio/sabt-pack/slideshow";

const FALLBACK_BAND_FILL = "#000000";
const FALLBACK_BAND_OPACITY = 0.55;

/** Hard ceiling on image bodies we'll pull into memory. 25MB is generous for
 *  any legitimate menu photo (R2 uploads are typically <5MB); anything past
 *  this is an attempt to OOM the worker. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/** Validates a candidate accent color as a 6- or 3-digit hex literal. Rejects
 *  anything that could be smuggled into the SVG markup. */
function isValidAccentColor(value: string | undefined): value is string {
  if (!value) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Build the allowlist of hostnames that fetchImageBuffer may pull from.
 *  Both the R2 public CDN URL (R2_PUBLIC_URL, e.g. images.getbustan.com) and
 *  the raw R2 endpoint (R2_ACCOUNT_ID.r2.cloudflarestorage.com) are accepted
 *  because legacy MenuItemImage rows may have either form. Anything else is
 *  treated as SSRF. */
function buildHostAllowlist(): Set<string> {
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(env.R2_PUBLIC_URL).hostname);
  } catch {
    // R2_PUBLIC_URL is validated as a URL in env.ts; defensive only.
  }
  if (env.R2_ACCOUNT_ID) {
    allowed.add(`${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  }
  return allowed;
}

/** Reject URLs that look like SSRF targets: non-https schemes, private/
 *  link-local/loopback IP literals, IPv6 link-local. We do NOT do DNS
 *  rebinding defense here — the allowlist catches that for the only
 *  hostnames we trust. */
function assertSafeImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ApiError(`Invalid menu image URL`, 422);
  }
  if (parsed.protocol !== "https:") {
    throw new ApiError(`Menu image URL must be https`, 422);
  }
  const host = parsed.hostname.toLowerCase();
  // Reject IP literals — every legit R2 URL is a hostname.
  // IPv4 dotted-quad: 1-3 digits . 1-3 digits . ...
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new ApiError(`Menu image URL must not be an IP literal`, 422);
  }
  // IPv6 in brackets.
  if (host.startsWith("[") || host.includes(":")) {
    throw new ApiError(`Menu image URL must not be an IPv6 literal`, 422);
  }
  const allowed = buildHostAllowlist();
  if (!allowed.has(host)) {
    throw new ApiError(
      `Menu image URL host "${host}" is not on the allowlist`,
      422
    );
  }
  return parsed;
}

/** Escape user text for safe SVG embedding. Strips < > & quotes. */
function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .slice(0, 80);
}

/** Wrap the headline at ~24 chars so it fits in 2 lines on the band. Naive
 *  greedy wrap on word boundaries; good enough for short hooks. */
function wrapHeadline(headline: string, maxCharsPerLine = 26): string[] {
  const words = headline.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current ? `${current} ` : "") + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
    if (lines.length >= 2) break;
  }
  if (current && lines.length < 2) lines.push(current);
  return lines.slice(0, 2);
}

function buildOverlaySvg(headline: string, accentColor?: string): Buffer {
  const lines = wrapHeadline(headline);
  // Refuse anything that isn't a strict hex literal — the value is interpolated
  // raw into the SVG and a malicious caller could otherwise smuggle markup.
  const bandFill = isValidAccentColor(accentColor) ? accentColor : FALLBACK_BAND_FILL;
  // Two-line layout: y positions tuned for 360px band height + 64px font.
  const y1 = lines.length === 2 ? OVERLAY_HEIGHT / 2 - 6 : OVERLAY_HEIGHT / 2 + 22;
  const y2 = OVERLAY_HEIGHT / 2 + 58;
  const escaped = lines.map(escapeSvg);

  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${FRAME_WIDTH}" height="${OVERLAY_HEIGHT}" viewBox="0 0 ${FRAME_WIDTH} ${OVERLAY_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bandFill}" stop-opacity="0"/>
      <stop offset="40%" stop-color="${bandFill}" stop-opacity="${FALLBACK_BAND_OPACITY}"/>
      <stop offset="100%" stop-color="${bandFill}" stop-opacity="${FALLBACK_BAND_OPACITY + 0.1}"/>
    </linearGradient>
  </defs>
  <rect width="${FRAME_WIDTH}" height="${OVERLAY_HEIGHT}" fill="url(#fade)"/>
  <g font-family="'Helvetica Neue','Inter','Arial',sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">
    ${escaped[0] ? `<text x="${FRAME_WIDTH / 2}" y="${y1}" font-size="64">${escaped[0]}</text>` : ""}
    ${escaped[1] ? `<text x="${FRAME_WIDTH / 2}" y="${y2}" font-size="64">${escaped[1]}</text>` : ""}
  </g>
</svg>`
  );
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  // SSRF defense: validate the host before hitting the network. MenuItemImage
  // rows are owner-controlled at upload time, and an attacker who controls
  // their own restaurant could otherwise force the worker to fetch internal
  // metadata endpoints, local services, or arbitrary intranet hosts.
  const parsed = assertSafeImageUrl(url);

  const response = await fetch(parsed.toString(), {
    // Soft network-level guards in addition to the host allowlist.
    redirect: "error",
  });
  if (!response.ok) {
    throw new ApiError(
      `Failed to fetch menu image (${response.status})`,
      502
    );
  }
  // Reject runaway payloads. A malicious or buggy origin could otherwise OOM
  // the worker. Use Content-Length when present, then enforce on read.
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new ApiError(
      `Menu image exceeds ${MAX_IMAGE_BYTES} byte cap`,
      413
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(
      `Menu image exceeds ${MAX_IMAGE_BYTES} byte cap`,
      413
    );
  }
  return Buffer.from(arrayBuffer);
}

async function loadMenuPhotoUrl(
  menuItemId: string,
  restaurantId: string
): Promise<string | null> {
  // Prefer the primary owner-uploaded image; fall back to the legacy imageUrl
  // field. Mirrors generateHeroImage's tryReuseMenuItemImage priority list.
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurantId },
    select: { id: true, imageUrl: true },
  });
  if (!item) return null;

  const primary = await prisma.menuItemImage.findFirst({
    where: {
      menuItemId,
      isPrimary: true,
      imageStatus: "ready",
      imageUrl: { not: null },
    },
    orderBy: [{ originType: "asc" }, { createdAt: "desc" }],
    select: { imageUrl: true },
  });
  if (primary?.imageUrl) return primary.imageUrl;

  // Fall back to any ready image, then to the legacy imageUrl field.
  const anyReady = await prisma.menuItemImage.findFirst({
    where: {
      menuItemId,
      imageStatus: "ready",
      imageUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { imageUrl: true },
  });
  if (anyReady?.imageUrl) return anyReady.imageUrl;

  return item.imageUrl ?? null;
}

async function renderFrame(args: {
  sourceUrl: string;
  headline: string;
  accentColor?: string;
}): Promise<Buffer> {
  const source = await fetchImageBuffer(args.sourceUrl);
  const overlay = buildOverlaySvg(args.headline, args.accentColor);

  return sharp(source)
    .rotate() // honor EXIF orientation
    .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: "cover", position: "centre" })
    .composite([
      {
        input: overlay,
        top: FRAME_HEIGHT - OVERLAY_HEIGHT,
        left: 0,
      },
    ])
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();
}

/**
 * Build the 5-frame slideshow for Sabt Pack slot 1.
 *
 * Returns whatever frames it could build, in order. If <5 frames succeed,
 * `fullSlideshow` is false and the caller should consider the slot degraded.
 * One bad frame must not torch the slot — slot-1 degradation is far better
 * than the whole pack failing.
 */
export async function buildSlideshowFrames(
  options: BuildSlideshowOptions
): Promise<BuildSlideshowResult> {
  if (options.frames.length === 0) {
    return { frameUrls: [], fullSlideshow: false, perFrame: [] };
  }

  const perFrame: BuildSlideshowResult["perFrame"] = [];
  const frameUrls: string[] = [];

  for (const frame of options.frames) {
    try {
      const sourceUrl = await loadMenuPhotoUrl(frame.menuItemId, options.restaurantId);
      if (!sourceUrl) {
        perFrame.push({
          menuItemId: frame.menuItemId,
          ok: false,
          reason: "no_ready_menu_image",
        });
        continue;
      }

      const buffer = await renderFrame({
        sourceUrl,
        headline: frame.headline,
        accentColor: options.accentColor,
      });

      const uploaded = await uploadBuffer({
        buffer,
        contentType: "image/jpeg",
        folder: `${SLIDESHOW_FOLDER}/${options.restaurantId}`,
      });

      frameUrls.push(uploaded.url);
      perFrame.push({ menuItemId: frame.menuItemId, ok: true });
    } catch (error) {
      perFrame.push({
        menuItemId: frame.menuItemId,
        ok: false,
        reason: error instanceof Error ? error.message : "render_failed",
      });
    }
  }

  return {
    frameUrls,
    fullSlideshow: frameUrls.length >= 5,
    perFrame,
  };
}
