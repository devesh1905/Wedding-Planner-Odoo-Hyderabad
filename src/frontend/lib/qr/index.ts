import QRCode from "qrcode";

const TOKEN = /^[a-zA-Z0-9_-]{16,256}$/;
export function checkinUrl(bookingToken: string): string {
  if (!TOKEN.test(bookingToken)) throw new Error("Invalid booking token");
  const path = `/v/${encodeURIComponent(bookingToken)}?action=checkin`;
  const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) throw new Error("Set NEXT_PUBLIC_APP_URL when generating printable check-in links on the server");
  const url = new URL(path, origin);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid application URL");
  return url.toString();
}
export async function qrDataUrl(text: string): Promise<string> {
  if (!text.trim() || text.length > 2000) throw new Error("QR text must contain 1-2000 characters");
  return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 4, width: 512 });
}
export function tokenFromScan(value: string): string {
  const trimmed = value.trim();
  if (TOKEN.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a booking code or scan a check-in QR");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid check-in link");
  const match = /^\/v\/([a-zA-Z0-9_-]{16,256})\/?$/.exec(url.pathname);
  if (!match?.[1]) throw new Error("This QR does not contain a booking code");
  return match[1];
}
