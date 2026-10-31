"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/utils";

/**
 * Hover (mouse), tap (touch) or focus (keyboard) a chart mark to see its numbers.
 * The tip is drawn in a portal with fixed positioning, so it is never clipped by a rounded,
 * overflow-hidden chart, and it is kept inside the screen edges.
 */
export function ChartTip({
  content,
  children,
  className,
  style,
}: {
  content: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const touch = useRef(false);
  const id = useId();

  // Place above the mark (below if there is no room), centred, clamped to the viewport.
  useLayoutEffect(() => {
    if (!open || !ref.current || !tipRef.current) return;
    const r = ref.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    const below = r.top - t.height - 10 < 0;
    const centre = r.left + r.width / 2;
    setPos({
      left: Math.min(Math.max(centre, t.width / 2 + 8), window.innerWidth - t.width / 2 - 8),
      top: below ? r.bottom + 8 : r.top - 8,
      below,
    });
  }, [open]);

  // A tap elsewhere, scrolling or Escape closes it.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "pointerdown" && ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        data-active={open || undefined}
        className={cn("cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
        style={style}
        onPointerDown={(e) => (touch.current = e.pointerType !== "mouse")}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        onClick={() => touch.current && setOpen((o) => !o)}
        onFocus={() => !touch.current && setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="pointer-events-none fixed z-[60] max-w-64 rounded-xl border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              transform: `translate(-50%, ${pos?.below ? "0" : "-100%"})`,
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A tidy tooltip body: a title line, then label/value rows. */
export function TipBody({ title, rows }: { title: React.ReactNode; rows: { label: string; value: string; tone?: string; strong?: boolean }[] }) {
  return (
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{r.label}</span>
          <span className={cn("tabular", r.strong && "font-semibold", r.tone)}>{r.value}</span>
        </p>
      ))}
    </div>
  );
}
