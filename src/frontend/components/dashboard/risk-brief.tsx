"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/frontend/components/icons/icon";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { cn } from "@/shared/utils";

type Risk = { id: string; severity: 1 | 2 | 3; couple: string; text: string; href: string };
type Brief = { note: string; risks: Risk[]; source: "assistant" | "rules"; generatedAt: string };

const TONE = {
  3: { dot: "bg-rose", label: "Today" },
  2: { dot: "bg-marigold", label: "This week" },
  1: { dot: "bg-muted-foreground/40", label: "Watch" },
} as const;

/**
 * "Morning brief": the few things that could go wrong this week. Loaded after the page so the
 * dashboard itself stays instant; the risks come from rules on live data (src/backend/ai/risk-brief.ts).
 */
export function RiskBrief({ className }: { className?: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [failed, setFailed] = useState(false);
  // three items keep the numbers below in view; the rest one click away
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/brief")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((b: Brief) => live && setBrief(b))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const hour = new Date().getHours();
  const title = hour < 12 ? "Morning brief" : hour < 17 ? "Afternoon brief" : "Evening brief";

  return (
    <section aria-label={title} className={cn("rounded-3xl border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="sun" className="size-5 text-marigold" />
          {title}
        </h2>
        {brief && (
          <span className="text-xs text-muted-foreground">
            {brief.source === "assistant" ? "Found by rules on live data · worded by the assistant" : "Found by rules on live data"}
          </span>
        )}
      </div>

      {!brief && !failed && (
        <div className="mt-4 space-y-3" role="status" aria-label="Loading the brief">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {failed && <p className="mt-3 text-sm text-muted-foreground">The brief could not load. Everything below is still live.</p>}

      {brief && (
        <>
          <p className="mt-2 text-sm text-pretty text-foreground/80">{brief.note}</p>
          {brief.risks.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {(all ? brief.risks : brief.risks.slice(0, 3)).map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="group -mx-2 flex min-h-11 items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE[r.severity].dot)} aria-hidden />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{r.couple}</span>
                      <span className="text-muted-foreground"> · {TONE[r.severity].label}</span>
                      <span className="mt-0.5 block text-pretty text-foreground/80">{r.text}</span>
                    </span>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {brief.risks.length > 3 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground">
              {all ? "Show fewer" : `${brief.risks.length - 3} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
