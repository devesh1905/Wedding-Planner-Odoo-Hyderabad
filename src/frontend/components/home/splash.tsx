"use client";

import { useEffect, useRef, useState } from "react";
import { KnotMark } from "./knot-mark";

const KEY = "knot:splash-seen";
// CSS timeline: knot draws (0–1.2s), flame catches (~1.1–2.1s) and breathes a moment.
const LIT_AT = 2900;
const SPREAD_MS = 1500; // the dark burns away outward from the flame, revealing the site
const AFTERGLOW_MS = 100; // the warm glow has already faded during the spread; just unmount

type Phase = "show" | "spread" | "afterglow" | "gone";

/**
 * First-visit splash. The knot draws itself and the flame catches while a counter runs 00 → 100.
 * Then the flame's light burns the dark away from the centre outwards: behind its glowing edge the
 * real home page is already there, so the site is *revealed* rather than faded in.
 * Once per session, skippable (click / any key); the root layout hides it for returning visitors.
 */
export function Splash() {
  const [phase, setPhase] = useState<Phase>("show");
  const [count, setCount] = useState(0);
  const [origin, setOrigin] = useState({ x: "50%", y: "45%" });
  const mark = useRef<HTMLDivElement>(null);

  // The reveal starts from the flame itself, wherever the mark sits on this screen.
  function startSpread() {
    const r = mark.current?.getBoundingClientRect();
    if (r) setOrigin({ x: `${r.left + r.width / 2}px`, y: `${r.top + r.height * (20 / 52)}px` });
    setPhase((p) => (p === "show" ? "spread" : p));
  }

  useEffect(() => {
    if (document.documentElement.dataset.nosplash === "1") return setPhase("gone");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}

    const start = Date.now();
    // Interval (not rAF) so it still advances if the tab is in the background.
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / LIT_AT);
      setCount(Math.round(100 * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) {
        clearInterval(timer);
        startSpread();
      }
    }, 30);
    window.addEventListener("keydown", startSpread, { once: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", startSpread);
    };
  }, []);

  useEffect(() => {
    if (phase === "spread") {
      const t = setTimeout(() => setPhase("afterglow"), SPREAD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "afterglow") {
      const t = setTimeout(() => setPhase("gone"), AFTERGLOW_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;
  const opening = phase !== "show";

  return (
    <div
      role="presentation"
      onClick={startSpread}
      style={{ "--fx": origin.x, "--fy": origin.y } as React.CSSProperties}
      className={`splash fixed inset-0 z-[100] ${opening ? "pointer-events-none" : "cursor-pointer"}`}
    >
      {/* The dark: a hole opens from the flame and grows past the screen edges. */}
      <div className={`splash-dark absolute inset-0 grid place-items-center bg-[oklch(0.2_0.06_18)] text-[oklch(0.93_0.04_80)] ${opening ? "splash-open" : ""}`}>
        <div className="flex flex-col items-center gap-6">
          <div ref={mark}>
            <KnotMark mode="draw" className="h-16 w-32" />
          </div>
          <p className="font-serif text-3xl tracking-wide">The Royal Knot</p>
        </div>
        <div className="absolute inset-x-6 bottom-8 flex items-end justify-between text-xs tracking-[0.3em] uppercase opacity-70 sm:inset-x-10">
          <span>Jaipur · Udaipur</span>
          <span className="font-serif text-5xl tracking-normal tabular opacity-100 sm:text-7xl">{String(count).padStart(2, "0")}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10">
          <div className="h-full bg-marigold" style={{ width: `${count}%` }} />
        </div>
      </div>

      {/* The light: a glowing wavefront riding the edge of the hole, plus warmth left behind it. */}
      <div aria-hidden className={`splash-front absolute inset-0 ${opening ? "splash-open" : ""} ${phase === "afterglow" ? "splash-settle" : ""}`} />
    </div>
  );
}
