"use client";
import { useEffect, useState } from "react";
import { Printer, QrCode } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { EmptyState } from "@/frontend/components/common/empty-state";
import { formatTime } from "@/shared/format";
import { checkinUrl, qrDataUrl } from "@/frontend/lib/qr";

export type QrPass = { id: string; token: string; vendorName: string; category: string; expectedArrival: string | null };

/** One printable card per vendor booking; the QR encodes the check-in link for that booking. */
export function QrPassSheet({ passes }: { passes: QrPass[] }) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    // Built in the browser so the link uses the address the planner is actually on.
    Promise.all(passes.map(async (pass) => [pass.id, await qrDataUrl(checkinUrl(pass.token))] as const))
      .then((entries) => {
        if (active) setImages(Object.fromEntries(entries));
      })
      .catch((problem) => {
        if (active) setError(problem instanceof Error ? problem.message : "Unable to create QR codes");
      });
    return () => {
      active = false;
    };
  }, [passes]);
  if (!passes.length)
    return <EmptyState icon={QrCode} title="No vendors booked yet" hint="Award proposals to connect vendors, then print their passes here." />;
  return (
    <div className="space-y-5">
      {/* Print only the sheet: hide everything else on the page. */}
      <style>{`@media print { body * { visibility: hidden !important; } #qr-sheet, #qr-sheet * { visibility: visible !important; } #qr-sheet { position: absolute; left: 0; top: 0; width: 100%; } html, body { height: auto !important; overflow: visible !important; } }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">Print and hand one pass to each vendor. Scanning it in the control room marks them arrived.</p>
        <Button className="min-h-11" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print passes
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-soft p-3 text-sm text-rose">
          {error}
        </p>
      )}
      <div id="qr-sheet" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {passes.map((pass) => (
          <article key={pass.id} className="break-inside-avoid rounded-xl border bg-card p-4 text-center">
            <h2 className="font-serif text-xl text-primary">{pass.vendorName}</h2>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{pass.category}</p>
            <p className="mt-1 text-sm">{pass.expectedArrival ? `Expected ${formatTime(pass.expectedArrival)}` : "Arrival time not set"}</p>
            <div className="mx-auto mt-3 size-48">
              {images[pass.id] ? (
                /* eslint-disable-next-line @next/next/no-img-element */ <img
                  src={images[pass.id]}
                  alt={`Check-in QR for ${pass.vendorName}`}
                  className="size-48"
                />
              ) : (
                <div className="size-48 animate-pulse rounded-md bg-muted" />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Scan on arrival at the venue</p>
          </article>
        ))}
      </div>
    </div>
  );
}
