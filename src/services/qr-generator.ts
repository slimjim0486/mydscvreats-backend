import QRCode from "qrcode";
import sharp from "sharp";
import { buildPrintQrOptions } from "@/lib/qr-code";

const PRESET_LABELS = {
  "50mm": "50 mm",
  "70mm": "70 mm",
  "100mm": "100 mm",
} as const;

export type QrPreset = keyof typeof PRESET_LABELS;
export type QrFormat = "svg" | "png";
const QR_CARD_PADDING = 24;
const QR_CARD_FOOTER_HEIGHT = 92;
const QR_CARD_BACKGROUND = "#FFF9F1";

function createDownloadFilename(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function renderQrSvg(url: string, size: number) {
  return QRCode.toString(url, {
    type: "svg",
    ...buildPrintQrOptions(size),
  });
}

async function renderPng(svg: string) {
  return sharp(Buffer.from(svg))
    .png({
      compressionLevel: 9,
      palette: true,
    })
    .toBuffer();
}

export async function generatePortfolioQrCode(input: {
  url: string;
  brandName: string;
  format: QrFormat;
  size?: 600 | 1200;
  preset?: QrPreset;
  includeBranding?: boolean;
}) {
  const preset = input.preset ?? "70mm";
  const size = input.size ?? 600;
  const qrSize = size - QR_CARD_PADDING * 2;
  const qrSvg = await renderQrSvg(input.url, qrSize);

  const footerText = input.includeBranding
    ? `${input.brandName} • mydscvr Eats • ${PRESET_LABELS[preset]}`
    : `${input.brandName} • ${PRESET_LABELS[preset]}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + QR_CARD_FOOTER_HEIGHT}" viewBox="0 0 ${size} ${size + QR_CARD_FOOTER_HEIGHT}">
      <rect width="100%" height="100%" fill="${QR_CARD_BACKGROUND}" rx="32" />
      <g transform="translate(${QR_CARD_PADDING}, ${QR_CARD_PADDING})">
        <rect width="${qrSize}" height="${qrSize}" rx="24" fill="#FFFFFF" />
        ${qrSvg}
      </g>
      <text x="${size / 2}" y="${size + 40}" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#201A17">${escapeXml(input.brandName)}</text>
      <text x="${size / 2}" y="${size + 70}" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#7A695E">${escapeXml(footerText)}</text>
    </svg>
  `.trim();

  if (input.format === "svg") {
    return {
      contentType: "image/svg+xml",
      filename: `${createDownloadFilename(input.brandName)}-${preset}.svg`,
      buffer: Buffer.from(svg),
    };
  }

  const png = await renderPng(svg);

  return {
    contentType: "image/png",
    filename: `${createDownloadFilename(input.brandName)}-${size}.png`,
    buffer: png,
  };
}

export async function generateSquareQrCode(input: {
  url: string;
  label: string;
  format: QrFormat;
  size?: 600 | 1200;
}) {
  const size = input.size ?? 600;
  const svg = await renderQrSvg(input.url, size);

  if (input.format === "svg") {
    return {
      contentType: "image/svg+xml",
      filename: `${createDownloadFilename(input.label)}-${size}.svg`,
      buffer: Buffer.from(svg),
    };
  }

  const png = await renderPng(svg);

  return {
    contentType: "image/png",
    filename: `${createDownloadFilename(input.label)}-${size}.png`,
    buffer: png,
  };
}
