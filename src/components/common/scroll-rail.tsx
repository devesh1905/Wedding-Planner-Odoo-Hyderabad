"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A slim horizontal scroller that sits above a wide row (the enquiry board) in place of the
 * browser's bottom scrollbar: drag the thumb, click the track to jump, or use the arrows.
 * Hides itself when everything already fits.
 */
export function ScrollRail({ target, className }: { target: React.RefObject<HTMLElement | null>; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ left: 0, ratio: 1, max: 0 });
  const drag = useRef<{ x: number; left: number } | null>(null);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => setM({ left: el.scrollLeft, ratio: el.clientWidth / el.scrollWidth, max: el.scrollWidth - el.clientWidth });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [target]);

  if (m.max <= 1) return null;
  const thumbPct = Math.max(m.ratio * 100, 8);
  const leftPct = (m.left / m.max) * (100 - thumbPct);
  const page = (dir: 1 | -1) => target.current?.scrollBy({ left: dir * target.current.clientWidth * 0.8, behavior: "smooth" });
  // px of content per px of track, so the thumb follows the hand exactly
  const scale = () => (target.current?.scrollWidth ?? 1) / (track.current?.clientWidth ?? 1);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={() => page(-1)} disabled={m.left <= 0} aria-label="Scroll left" className="grid size-7 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
        <ChevronLeft className="size-4" />
      </button>
      <div
        ref={track}
        className="relative h-2 w-40 cursor-pointer rounded-full bg-muted sm:w-56"
        onPointerDown={(e) => {
          if (e.target !== e.currentTarget || !target.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          const frac = (e.clientX - r.left) / r.width;
          target.current.scrollTo({ left: frac * target.current.scrollWidth - target.current.clientWidth / 2, behavior: "smooth" });
        }}
      >
        <div
          role="scrollbar"
          aria-orientation="horizontal"
          aria-valuenow={Math.round((m.left / m.max) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scroll the board"
          tabIndex={0}
          className="absolute inset-y-0 cursor-grab touch-none rounded-full bg-cta transition-[background-color] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          style={{ width: `${thumbPct}%`, left: `${leftPct}%` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, left: target.current?.scrollLeft ?? 0 };
          }}
          onPointerMove={(e) => {
            if (drag.current && target.current) target.current.scrollLeft = drag.current.left + (e.clientX - drag.current.x) * scale();
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") page(1);
            if (e.key === "ArrowLeft") page(-1);
          }}
        />
      </div>
      <button type="button" onClick={() => page(1)} disabled={m.left >= m.max - 1} aria-label="Scroll right" className="grid size-7 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
