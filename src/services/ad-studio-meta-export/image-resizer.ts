// Sharp-based image resizer for Meta placements.
//
// Source: 9:16 hero (typically 1080×1920) from the orchestrator.
// Targets (per KB platforms.ts master spec):
//   - 9:16 (1080×1920) — Reels, Stories, CTWA
//   - 4:5 (1080×1350) — Feed (mobile-best)
//   - 1:1 (1080×1080) — Carousel, Square
//   - 1.91:1 (1200×628) — PMax landscape, Audience Network
//
// Strategy: cover-crop centered. The Bustan creative is composed with the dish
// in the lower-third intersection, so a center crop preserves it for 4:5 and
// 1:1. For 1.91:1 we crop more aggressively from the top — the safe-zone
// rules in the KB place dish/CTA in the lower 40% so a top-bias crop preserves
// it.

import sharp from "sharp";
import { ApiError } from "@/lib/errors";

export interface MetaImageVariants {
  /** 1080×1920 — Reels, Stories, CTWA. */
  vertical_9_16: Buffer;
  /** 1080×1350 — Feed mobile. */
  vertical_4_5: Buffer;
  /** 1080×1080 — Carousel, Square. */
  square_1_1: Buffer;
  /** 1200×628 — PMax/Display landscape. */
  landscape_1_91_1: Buffer;
}

const TARGETS = {
  vertical_9_16: { width: 1080, height: 1920, gravity: "center" as const },
  vertical_4_5: { width: 1080, height: 1350, gravity: "center" as const },
  square_1_1: { width: 1080, height: 1080, gravity: "center" as const },
  // Top-bias for the wide landscape: dish typically lives in the lower third
  // of the 9:16 source, but landscape cuts off the bottom 40% — pull "top"
  // gravity so the headline + dish-top remain visible.
  landscape_1_91_1: { width: 1200, height: 628, gravity: "north" as const },
};

/**
 * Resize a single source image (any size) into the four Meta-required
 * aspect ratios. Returns JPEG buffers (smaller payload than PNG; food
 * photos compress well as JPEG).
 */
export async function buildMetaImageVariants(sourceBuffer: Buffer): Promise<MetaImageVariants> {
  if (!sourceBuffer || sourceBuffer.length === 0) {
    throw new ApiError("Empty source image buffer", 400);
  }

  // Validate the source is a real image; sharp throws on garbage.
  try {
    await sharp(sourceBuffer).metadata();
  } catch (error) {
    throw new ApiError(`Source image is not a valid image: ${(error as Error).message}`, 400);
  }

  const out: Partial<MetaImageVariants> = {};
  for (const [key, spec] of Object.entries(TARGETS) as Array<[keyof MetaImageVariants, typeof TARGETS.vertical_9_16]>) {
    out[key] = await sharp(sourceBuffer)
      .resize({
        width: spec.width,
        height: spec.height,
        fit: "cover",
        position: spec.gravity,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  }

  return out as MetaImageVariants;
}

/**
 * Fetch a remote image (R2 URL) and run it through buildMetaImageVariants.
 * Reuses the SSRF guard pattern from export-bundle: HTTPS-only, host-allowlist,
 * size-cap, timeout.
 */
export async function buildMetaImageVariantsFromUrl(
  url: string,
  options: { isAllowedHost: (url: string) => boolean }
): Promise<MetaImageVariants> {
  if (!options.isAllowedHost(url)) {
    throw new ApiError(`Refused to fetch image from disallowed host: ${url}`, 400);
  }
  const FETCH_TIMEOUT_MS = 15_000;
  const FETCH_MAX_BYTES = 25 * 1024 * 1024;

  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new ApiError(`Failed to fetch source image: ${response.status}`, 502);
  }
  const declaredLen = Number(response.headers.get("content-length") ?? "0");
  if (declaredLen > 0 && declaredLen > FETCH_MAX_BYTES) {
    throw new ApiError(`Source image exceeds size cap`, 413);
  }
  const ab = await response.arrayBuffer();
  if (ab.byteLength > FETCH_MAX_BYTES) {
    throw new ApiError(`Source image exceeds size cap`, 413);
  }
  return buildMetaImageVariants(Buffer.from(ab));
}

export const META_IMAGE_FILENAMES: Record<keyof MetaImageVariants, string> = {
  vertical_9_16: "hero-9x16.jpg",
  vertical_4_5: "hero-4x5.jpg",
  square_1_1: "hero-1x1.jpg",
  landscape_1_91_1: "hero-191x1.jpg",
};
