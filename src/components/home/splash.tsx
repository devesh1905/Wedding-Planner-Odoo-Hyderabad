"use client";

import { useEffect, useState } from "react";
import { KnotMark } from "./knot-mark";

const KEY = "knot:splash-seen";
const DURATION = 1500;

// Runs before first paint: returning visitors (or reduced-motion users) never see the splash flash.
const preflight = `try{if(sessionStorage.getItem('${KEY}')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.nosplash='1'}catch(e){}`;

/**
 * First-visit splash: the monogram draws itself while a film-style counter runs 00 → 100,
 * so the wait feels intentional. Rendered on the server so it covers the page from the first
 * frame; once per session; skippable (click / any key).
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (document.documentElement.dataset.nosplash === "1") return setPhase("gone");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}

    const start = Date.now();
    // Interval (not rAF) so the counter still advances if the tab is in the background.
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setCount(Math.round(100 * (1 - Math.pow(1 - p, 3)))); // ease-out
      if (p >= 1) {
        clearInterval(timer);
        setPhase("leave");
      }
    }, 30);
    const skip = () => setPhase("leave");
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leave") return;
    const t = setTimeout(() => setPhase("gone"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: preflight }} />
      <div
        role="presentation"
        onClick={() => setPhase("leave")}
        className={`splash fixed inset-0 z-[100] grid cursor-pointer place-items-center bg-[oklch(0.2_0.06_18)] text-[oklch(0.93_0.04_80)] ${phase === "leave" ? "splash-leave" : ""}`}
      >
        <div className="flex flex-col items-center gap-6">
          <KnotMark animate className="h-16 w-28 text-marigold" />
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
    </>
  );
}
