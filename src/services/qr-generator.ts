import QRCode from "qrcode";
import sharp from "sharp";

const PRESET_LABELS = {
  "50mm": "50 mm",
  "70mm": "70 mm",
  "100mm": "100 mm",
} as const;

export type QrPreset = keyof typeof PRESET_LABELS;
export type QrFormat = "svg" | "png";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
  const qrSvg = await QRCode.toString(input.url, {
    type: "svg",
    width: size,
    margin: 1,
    color: { dark: "#201A17", light: "#FFFDF9" },
    errorCorrectionLevel: "M",
  });

  const footerText = input.includeBranding
    ? `${input.brandName} • mydscvr Eats • ${PRESET_LABELS[preset]}`
    : `${input.brandName} • ${PRESET_LABELS[preset]}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 92}" viewBox="0 0 ${size} ${size + 92}">
      <rect width="100%" height="100%" fill="#FFF9F1" rx="32" />
      <g transform="translate(24, 24)">
        <rect width="${size - 48}" height="${size - 48}" rx="24" fill="#FFFFFF" />
        <g transform="translate(${(size - 48 - size) / 2}, ${(size - 48 - size) / 2})">
          ${qrSvg}
        </g>
      </g>
      <text x="${size / 2}" y="${size + 40}" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#201A17">${escapeXml(input.brandName)}</text>
      <text x="${size / 2}" y="${size + 70}" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" fill="#7A695E">${escapeXml(footerText)}</text>
    </svg>
  `.trim();

  if (input.format === "svg") {
    return {
      contentType: "image/svg+xml",
      filename: `${input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${preset}.svg`,
      buffer: Buffer.from(svg),
    };
  }

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return {
    contentType: "image/png",
    filename: `${input.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${size}.png`,
    buffer: png,
  };
}
