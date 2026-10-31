import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { checkinUrl, qrDataUrl, tokenFromScan } from "./index";
import { QrScanner } from "@/frontend/components/live/qr-scanner";

async function main(): Promise<void> {
  process.env.NEXT_PUBLIC_APP_URL = "https://knotos.example";
  const token = "82b9af1f-3908-4cdb-8912-18a3ab109a50";
  const url = checkinUrl(token);
  const encoded = await qrDataUrl(url);
  const png = PNG.sync.read(Buffer.from(encoded.split(",")[1]!, "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, url);
  assert.equal(tokenFromScan(decoded!.data), token);
  assert.equal(tokenFromScan(token), token);
  assert.throws(() => tokenFromScan("https://example.com/other"));
  assert.throws(() => checkinUrl("bad/token"));
  assert.match(renderToStaticMarkup(createElement(QrScanner, { onScan: () => {} })), /Or enter the booking code/);
  console.log("QR: generated PNG decoded to booking token; scanner server render passed");
}
void main();
