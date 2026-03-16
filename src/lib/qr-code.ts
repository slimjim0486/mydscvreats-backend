import QRCode from "qrcode";

export const PRINT_QR_MARGIN = 4;
export const PRINT_QR_ERROR_CORRECTION = "Q" as const;
export const PRINT_QR_COLORS = {
  dark: "#111111",
  light: "#FFFFFF",
} as const;

export function buildPrintQrOptions(size: number) {
  return {
    width: size,
    margin: PRINT_QR_MARGIN,
    color: PRINT_QR_COLORS,
    errorCorrectionLevel: PRINT_QR_ERROR_CORRECTION,
  };
}

export async function generateQrDataUrl(
  data: string,
  size = 200
): Promise<string> {
  return QRCode.toDataURL(data, buildPrintQrOptions(size));
}
