"use client";

import { useState } from "react";
import { formatINRCompact } from "@/shared/format";
import { cn } from "@/shared/utils";

/**
 * Donut: of every rupee billed, how much went to vendors, the team, and what was left.
 * Hover, tap or focus a slice (or its legend row) to light it up and read its amount in the centre.
 */
export function RupeeRing({ revenue, vendor, team, profit }: { revenue: number; vendor: number; team: number; profit: number }) {
  const [active, setActive] = useState<string | null>(null);
  const total = Math.max(revenue, vendor + team, 1);
  const parts = [
    { label: "Vendors", value: vendor, cls: "stroke-marigold", dot: "bg-marigold", note: "agreed fees + extras" },
    { label: "Team", value: team, cls: "stroke-muted-foreground/50", dot: "bg-muted-foreground/50", note: "planner hours × hourly cost" },
    {
      label: profit >= 0 ? "Profit" : "Loss",
      value: Math.abs(profit),
      cls: profit >= 0 ? "stroke-teal" : "stroke-rose",
      dot: profit >= 0 ? "bg-teal" : "bg-rose",
      note: "what the agency keeps",
    },
  ];
  const C = 2 * Math.PI * 40;
  let offset = 0;
  const shown = parts.find((p) => p.label === active);
  const share = (v: number) => Math.round((v / total) * 100);
  // The same handlers serve the slices and the legend rows. Hover is mouse-only: on a phone the
  // touch would also fire "enter", and the tap that follows must select, not toggle it back off.
  const bind = (label: string) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setActive(label),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setActive(null),
    onFocus: () => setActive(label),
    onBlur: () => setActive(null),
    onClick: () => setActive(label),
  });

  return (
    <div className="mt-3 flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="40" fill="none" className="stroke-muted" strokeWidth="11" />
          {parts.map((p) => {
            const len = (p.value / total) * C;
            const el = (
              <circle
                key={p.label}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                strokeWidth={active === p.label ? 14 : 11}
                className={cn("dash-ring cursor-pointer transition-[stroke-width,opacity] duration-200", p.cls, active && active !== p.label && "opacity-30")}
                strokeDasharray={`${Math.max(len - 1.2, 0)} ${C}`}
                strokeDashoffset={-offset}
                {...bind(p.label)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {/* centre read-out: the hovered slice, else the margin */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-live="polite">
          {shown ? (
            <div>
              <p className="text-base leading-tight font-semibold tabular">{formatINRCompact(shown.value)}</p>
              <p className="text-[11px] text-muted-foreground">
                {shown.label} · {share(shown.value)}%
              </p>
            </div>
          ) : (
            <div>
              <p className={cn("text-base leading-tight font-semibold tabular", profit < 0 ? "text-rose" : "text-teal")}>{share(profit)}%</p>
              <p className="text-[11px] text-muted-foreground">margin</p>
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="mb-2">
          <p className="text-2xl font-semibold tabular">{formatINRCompact(revenue)}</p>
          <p className="text-xs text-muted-foreground">billed to couples</p>
        </div>
        {parts.map((p) => (
          <button
            key={p.label}
            type="button"
            {...bind(p.label)}
            className={cn(
              "-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors",
              active === p.label ? "bg-muted" : "hover:bg-muted/60",
            )}
          >
            <span className={cn("size-2 rounded-full", p.dot)} />
            <span className="flex-1 text-muted-foreground">
              {p.label}
              {active === p.label && <span className="block text-[11px]">{p.note}</span>}
            </span>
            <span className="font-medium tabular">{share(p.value)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
