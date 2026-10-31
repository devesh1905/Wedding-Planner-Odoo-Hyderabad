"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils";

/**
 * A vertical scroller with a slim themed thumb in place of the browser's scrollbar.
 * The mouse wheel, trackpad and keyboard scroll it natively; the thumb can also be dragged.
 * Wheel scrolling stays inside the panel (overscroll-contain) so it never drags the page with it.
 * `className` sizes the panel (e.g. a max height); `innerClassName` styles the scrolling content.
 */
export function ScrollPanel({ className, innerClassName, children }: { className?: string; innerClassName?: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ top: 0, ratio: 1, max: 0 });
  const drag = useRef<{ y: number; top: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setM({ top: el.scrollTop, ratio: el.clientHeight / el.scrollHeight, max: el.scrollHeight - el.clientHeight });
    update();
    el.addEventListener("scroll", update, { passive: true });
    // content changes height when a disclosure opens, so watch the children too
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scrollable = m.max > 1;
  const thumbPct = Math.max(m.ratio * 100, 10);
  const topPct = scrollable ? (m.top / m.max) * (100 - thumbPct) : 0;

  return (
    <div className={cn("group/scroll relative flex min-h-0 flex-col", className)}>
      <div ref={box} className={cn("no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain", innerClassName)}>
        {children}
      </div>
      {scrollable && (
        <div aria-hidden className="pointer-events-none absolute inset-y-3 right-1 w-1.5">
          <div
            className={cn(
              "pointer-events-auto absolute inset-x-0 cursor-grab touch-none rounded-full bg-muted-foreground/30 transition-colors group-hover/scroll:bg-muted-foreground/50 active:cursor-grabbing active:bg-maroon/70",
            )}
            style={{ height: `${thumbPct}%`, top: `${topPct}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              drag.current = { y: e.clientY, top: box.current?.scrollTop ?? 0 };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const el = box.current;
              if (!drag.current || !el) return;
              const track = e.currentTarget.parentElement!.clientHeight;
              // px of content per px of track, so the thumb follows the hand exactly
              el.scrollTop = drag.current.top + (e.clientY - drag.current.y) * (el.scrollHeight / track);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
        </div>
      )}
    </div>
  );
}
