"use client";

import { useEffect, useState } from "react";
import { checkinUrl, qrDataUrl } from "@/frontend/lib/qr";

/** The vendor's check-in QR, drawn in the browser so the link uses the address this page is on. */
export function PassQr({ token, label }: { token: string; label: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    qrDataUrl(checkinUrl(token)).then(setSrc).catch(() => setSrc(""));
  }, [token]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`Check-in QR for ${label}`} className="size-64 rounded-2xl bg-white p-2 [image-rendering:pixelated]" />
  ) : (
    <div className="size-64 animate-pulse rounded-2xl bg-muted" aria-label="Loading QR code" />
  );
}
