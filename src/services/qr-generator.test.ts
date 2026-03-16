import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { PRINT_QR_ERROR_CORRECTION, PRINT_QR_MARGIN, generateQrDataUrl } from "@/lib/qr-code";
import { generatePortfolioQrCode, generateSquareQrCode } from "@/services/qr-generator";

function decodeDataUrl(dataUrl: string) {
  const [, base64 = ""] = dataUrl.split(",", 2);
  return Buffer.from(base64, "base64");
}

async function findMinDarkPixel(buffer: Buffer, width: number, height: number) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .extract({ left: 0, top: 0, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];

      if (alpha > 0 && red < 80 && green < 80 && blue < 80) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
      }
    }
  }

  return {
    x: minX,
    y: minY,
  };
}

test("shared QR settings are print-safe", () => {
  assert.equal(PRINT_QR_MARGIN, 4);
  assert.equal(PRINT_QR_ERROR_CORRECTION, "Q");
});

test("portfolio QR card keeps dark modules well inside the outer edge", async () => {
  const result = await generatePortfolioQrCode({
    url: "https://mydscvr.ai/test-restaurant",
    brandName: "Test Restaurant",
    format: "png",
    size: 600,
    preset: "70mm",
    includeBranding: true,
  });

  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.width, 600);
  assert.equal(metadata.height, 692);

  const minDarkPixel = await findMinDarkPixel(result.buffer, 600, 600);
  assert.ok(minDarkPixel.x > 70, `expected left quiet zone, got x=${minDarkPixel.x}`);
  assert.ok(minDarkPixel.y > 70, `expected top quiet zone, got y=${minDarkPixel.y}`);
});

test("square QR keeps dark modules away from the edge", async () => {
  const result = await generateSquareQrCode({
    url: "https://mydscvr.ai/r/AbC1234",
    label: "Launch Kit",
    format: "png",
    size: 600,
  });

  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.width, 600);
  assert.equal(metadata.height, 600);

  const minDarkPixel = await findMinDarkPixel(result.buffer, 600, 600);
  assert.ok(minDarkPixel.x > 50, `expected left quiet zone, got x=${minDarkPixel.x}`);
  assert.ok(minDarkPixel.y > 50, `expected top quiet zone, got y=${minDarkPixel.y}`);
});

test("data-url QR keeps quiet zone for PDF export", async () => {
  const dataUrl = await generateQrDataUrl("https://mydscvr.ai/test-restaurant", 300);
  const buffer = decodeDataUrl(dataUrl);
  const metadata = await sharp(buffer).metadata();

  assert.equal(metadata.width, 300);
  assert.equal(metadata.height, 300);

  const minDarkPixel = await findMinDarkPixel(buffer, 300, 300);
  assert.ok(minDarkPixel.x > 20, `expected left quiet zone, got x=${minDarkPixel.x}`);
  assert.ok(minDarkPixel.y > 20, `expected top quiet zone, got y=${minDarkPixel.y}`);
});
