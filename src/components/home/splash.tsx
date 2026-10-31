"use client";

import { useEffect, useRef, useState } from "react";
import { KnotMark } from "./knot-mark";

const KEY = "knot:splash-seen";
// CSS timeline: knot draws (0–1.2s), thread lights (1.05–1.75s), flame catches (1.6–2.5s).
const LIT_AT = 3200; // flame is fully lit by ~2.5s; let it breathe a moment before the light spreads
const SPREAD_MS = 1100;
const REVEAL_MS = 600;

// Runs before first paint: returning visitors (or reduced-motion users) never see the splash flash.
const preflight = `try{if(sessionStorage.getItem('${KEY}')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.nosplash='1'}catch(e){}`;

type Phase = "show" | "spread" | "reveal" | "gone";

/**
 * First-visit splash. The knot draws itself and a counter runs 00 → 100 while the flame is lit;
 * then the flame's light spreads across the whole screen and dissolves into the home page.
 * Once per session, skippable (click / any key), rendered on the server so it covers the first frame.
 */
export function Splash() {
  const [phase, setPhase] = useState<Phase>("show");
  const [count, setCount] = useState(0);
  const [origin, setOrigin] = useState({ x: "50%", y: "45%" });
  const mark = useRef<HTMLDivElement>(null);

  // Light spreads from the flame itself, wherever the mark sits on this screen.
  function startSpread() {
    const r = mark.current?.getBoundingClientRect();
    if (r) setOrigin({ x: `${r.left + r.width / 2}px`, y: `${r.top + r.height * (18 / 52)}px` });
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
      const t = setTimeout(() => setPhase("reveal"), SPREAD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("gone"), REVEAL_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: preflight }} />
      <div
        role="presentation"
        onClick={startSpread}
        style={{ "--fx": origin.x, "--fy": origin.y } as React.CSSProperties}
        className={`splash fixed inset-0 z-[100] cursor-pointer ${phase === "reveal" ? "splash-reveal" : ""}`}
      >
        <div className="absolute inset-0 grid place-items-center bg-[oklch(0.2_0.06_18)] text-[oklch(0.93_0.04_80)]">
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

        {/* Flame light: grows from the flame to fill the screen, warm at the centre, page-ivory at the edge. */}
        <div aria-hidden className={`splash-light absolute inset-0 ${phase !== "show" ? "splash-light-on" : ""}`} />
      </div>
    </>
  );
}
