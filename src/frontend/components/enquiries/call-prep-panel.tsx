"use client";

import { useState } from "react";
import { Copy, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/frontend/components/icons/icon";
import { Button } from "@/frontend/components/ui/button";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { api } from "@/frontend/lib/api-client";
import { serviceByKey } from "@/shared/package-builder";
import type { CallPrep } from "@/backend/api/enquiries/[id]/call-prep/handler";

/** "Prep me for the call": generated on click, never cached. */
export function CallPrepPanel({ enquiryId }: { enquiryId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<CallPrep | null>(null);

  async function run() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setPrep(await api<CallPrep>(`/api/enquiries/${enquiryId}/call-prep`, { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare the call");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!prep) return;
    const text = ["Talking points", ...prep.talkingPoints.map((p, i) => `${i + 1}. ${p}`)].join("\n");
    navigator.clipboard.writeText(text).then(
      () => toast.success("Talking points copied"),
      () => toast.error("Could not copy"),
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full justify-start" onClick={run}>
        <Icon name="idea" /> Prep me for the call
      </Button>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-muted/40 p-4" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="idea" className="size-4" /> Call prep
          {prep?.basic && !loading && <span className="rounded-full border bg-card px-2 py-0.5 text-xs font-normal text-muted-foreground">Basic prep</span>}
        </h3>
        <div className="flex gap-2">
          {prep && !loading && (
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy /> Copy
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={run} disabled={loading} aria-label="Regenerate">
            {loading ? <Loader2 className="animate-spin" /> : <RotateCw />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Reading the enquiry and checking vendors…</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose/40 bg-card p-3 text-sm">
          <p className="text-rose">{error}</p>
          <Button size="sm" variant="outline" onClick={run}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && prep && (
        <>
          <p className="text-sm whitespace-pre-line">{prep.summary}</p>

          {prep.risks.length > 0 && (
            <ul className="space-y-1.5">
              {prep.risks.map((r) => (
                <li key={r} className="flex items-start gap-2 rounded-lg border border-rose/40 bg-card px-3 py-2 text-sm text-rose">
                  <Icon name="warning" className="mt-0.5" /> <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          <div>
            <h4 className="mb-2 text-sm font-semibold">Talking points</h4>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {prep.talkingPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>

          {prep.vendors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Suggested vendors</h4>
              {prep.vendors.map((g) => (
                <div key={g.service} className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name={serviceByKey(g.service)?.icon ?? "check"} className="size-3.5" /> {g.label}
                  </p>
                  {g.picks.length === 0 && <p className="text-sm text-muted-foreground">{g.note}</p>}
                  <ul className="space-y-1.5">
                    {g.picks.map((v) => (
                      <li key={v.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium">{v.name}</span>
                          <span className="text-xs text-muted-foreground">{v.category.toLowerCase()}</span>
                        </div>
                        {v.priceLabel && <p className="tabular text-xs">{v.priceLabel}</p>}
                        <p className="text-xs text-muted-foreground">{v.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
