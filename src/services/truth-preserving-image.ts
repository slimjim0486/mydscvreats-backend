import sharp from "sharp";
import { ApiError } from "@/lib/errors";

async function downloadImageBuffer(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new ApiError(`Failed to download source image (${response.status})`, 502);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function createTruthPreservingEditFromUrl(imageUrl: string) {
  const inputBuffer = await downloadImageBuffer(imageUrl);

  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .flatten({ background: "#f6f1e8" })
    .trim({ threshold: 8 })
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .normalize()
    .modulate({
      brightness: 1.03,
      saturation: 1.05,
    })
    .sharpen({ sigma: 0.7 })
    .jpeg({
      quality: 90,
      chromaSubsampling: "4:4:4",
    })
    .toBuffer();

  return {
    buffer: outputBuffer,
    contentType: "image/jpeg" as const,
    extension: "jpg" as const,
  };
}
