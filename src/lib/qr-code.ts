import QRCode from "qrcode";

export async function generateQrDataUrl(
  data: string,
  size = 200
): Promise<string> {
  return QRCode.toDataURL(data, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}
