"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Cave mode (couples' home, dark theme only).
 *
 * One light — the diya's flame — drives everything, updated once per frame:
 *  • darkness: a full-screen layer whose transparency falls off with distance from the flame
 *    (soft core, long tail ≈ 1 / (1 + (d/r)²)); radius is huge when slotted (room lit), small when carried
 *  • warmth: a firelight tint blended over what's lit
 *  • shadows: every [data-cast] element gets a drop-shadow pointing away from the flame;
 *    longer, softer and fainter with distance
 *  • flicker: smooth noise nudges intensity and position, so light and shadows breathe together
 *
 * The diya lives in <DiyaSlot> niches. Slotted = light switch on for the page. Grab it = the room
 * goes dark and it becomes a lamp you carry. Near a slot it's pulled in. Scrolling glides it to the
 * slot nearest the middle of the screen.
 */

const slots = new Map<string, HTMLElement>();
const CARRY_RADIUS = 230;
const SNAP_DISTANCE = 110;
const IDLE_RETURN_MS = 6000;

export function DiyaSlot({ id, className, label = "Place the diya here" }: { id: string; className?: string; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current!;
    slots.set(id, el);
    return () => {
      slots.delete(id);
    };
  }, [id]);
  return (
    <button
      ref={ref}
      type="button"
      data-diya-slot={id}
      aria-label={label}
      onClick={() => window.dispatchEvent(new CustomEvent("diya:slot", { detail: id }))}
      className={cn("diya-slot hidden dark:block", className)}
    />
  );
}

// smooth 1D noise for flicker (sum of incommensurate sines — cheap, never repeats visibly)
const flicker = (t: number) => 0.5 * Math.sin(t * 2.1) + 0.3 * Math.sin(t * 5.3 + 1.7) + 0.2 * Math.sin(t * 11.7 + 0.4);

export function CaveMode() {
  const [dark, setDark] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const html = document.documentElement;
    const update = () => setDark(html.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  if (!dark) return null;
  return <Cave reduce={!!reduce} />;
}

function Cave({ reduce }: { reduce: boolean }) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const radius = useMotionValue(CARRY_RADIUS);
  const [mode, setMode] = useState<"slotted" | "carried" | "flying">("flying");
  const slotId = useRef<string | null>(null);
  const flying = useRef(false);
  const dragging = useRef(false);
  const idleTimer = useRef<number>(0);
  const darkRef = useRef<HTMLDivElement>(null);
  const warmRef = useRef<HTMLDivElement>(null);

  const bigRadius = () => Math.hypot(innerWidth, innerHeight) * 1.25;
  const slotCenter = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
  };

  const nearestSlot = useCallback((px: number, py: number, visibleOnly: boolean) => {
    let best: { id: string; d: number } | null = null;
    for (const [id, el] of slots) {
      const r = el.getBoundingClientRect();
      if (visibleOnly && (r.bottom < 0 || r.top > innerHeight)) continue;
      const c = slotCenter(el);
      const d = Math.hypot(c.x - px, c.y - py);
      if (!best || d < best.d) best = { id, d };
    }
    return best;
  }, []);

  // Fly into a slot, then switch the room's light on.
  const dock = useCallback(
    (id: string) => {
      const el = slots.get(id);
      if (!el) return;
      slotId.current = id;
      const c = slotCenter(el);
      flying.current = true;
      setMode("flying");
      const opts = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 140, damping: 20, mass: 0.9 };
      Promise.all([animate(x, c.x, opts).finished, animate(y, c.y, opts).finished]).then(() => {
        flying.current = false;
        if (slotId.current !== id || dragging.current) return;
        setMode("slotted");
        animate(radius, bigRadius(), { duration: reduce ? 0 : 0.8, ease: [0.3, 0, 0.2, 1] });
      });
    },
    [radius, reduce, x, y],
  );

  // Start in the slot nearest the top of the page.
  useEffect(() => {
    const t = setTimeout(() => {
      const first = nearestSlot(innerWidth / 2, 0, true) ?? nearestSlot(innerWidth / 2, 0, false);
      if (first) {
        const c = slotCenter(slots.get(first.id)!);
        x.set(c.x);
        y.set(c.y);
        dock(first.id);
      }
    }, 60);
    return () => clearTimeout(t);
  }, [dock, nearestSlot, x, y]);

  // Scrolling: follow the docked slot; glide to the slot nearest mid-screen when it changes.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (dragging.current) return;
        const best = nearestSlot(innerWidth / 2, innerHeight / 2, true);
        if (best && best.id !== slotId.current) dock(best.id);
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    const onSlot = (e: Event) => dock((e as CustomEvent<string>).detail);
    addEventListener("diya:slot", onSlot);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("diya:slot", onSlot);
      cancelAnimationFrame(raf);
    };
  }, [dock, nearestSlot]);

  // Keyboard: L toggles between lamp-in-hand and slotted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.closest("input,textarea")) return;
      if (mode === "slotted") {
        setMode("carried");
        slotId.current = null;
        animate(radius, CARRY_RADIUS, { duration: reduce ? 0 : 0.5 });
      } else {
        const best = nearestSlot(x.get(), y.get(), true);
        if (best) dock(best.id);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [dock, mode, nearestSlot, radius, reduce, x, y]);

  // The light loop: one source of truth → darkness, warmth and every cast shadow.
  useEffect(() => {
    let raf = 0;
    let casters: HTMLElement[] = [];
    let lastScan = 0;
    const html = document.documentElement;
    const tick = (now: number) => {
      // keep the diya glued to its slot while the page scrolls
      if (mode === "slotted" && slotId.current && !flying.current && !dragging.current) {
        const el = slots.get(slotId.current);
        if (el) {
          const c = slotCenter(el);
          x.set(c.x);
          y.set(c.y);
        }
      }
      const t = now / 1000;
      const f = reduce ? 0 : flicker(t);
      const lx = x.get() + (reduce ? 0 : f * 1.2);
      const ly = y.get() - 18 + (reduce ? 0 : flicker(t + 9) * 1.2); // the flame sits above the bowl
      const r = radius.get() * (1 + f * 0.05);
      html.style.setProperty("--lx", `${lx}px`);
      html.style.setProperty("--ly", `${ly}px`);
      html.style.setProperty("--lr", `${r}px`);
      html.style.setProperty("--li", `${0.9 + f * 0.08}`);

      if (now - lastScan > 800) {
        casters = Array.from(document.querySelectorAll<HTMLElement>("[data-cast]"));
        lastScan = now;
      }
      const lit = r > CARRY_RADIUS * 2; // shadows are subtler when the whole room is lit
      for (const el of casters) {
        const b = el.getBoundingClientRect();
        if (b.bottom < -50 || b.top > innerHeight + 50) continue;
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const dx = cx - lx;
        const dy = cy - ly;
        const d = Math.max(1, Math.hypot(dx, dy));
        // shadow length grows with distance, capped; blur grows too; strength fades
        const len = Math.min(28, 3 + d * 0.035) * (lit ? 0.8 : 1);
        const blur = 2 + d * 0.012;
        const alpha = Math.max(0.12, Math.min(0.6, 0.62 - d / 2600)) * (lit ? 0.75 : 1);
        el.style.filter = `drop-shadow(${((dx / d) * len).toFixed(1)}px ${((dy / d) * len).toFixed(1)}px ${blur.toFixed(1)}px rgb(0 0 0 / ${alpha.toFixed(2)}))`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const el of document.querySelectorAll<HTMLElement>("[data-cast]")) el.style.filter = "";
      for (const p of ["--lx", "--ly", "--lr", "--li"]) html.style.removeProperty(p);
    };
  }, [mode, radius, reduce, x, y]);

  function scheduleReturn() {
    clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (dragging.current) return;
      const best = nearestSlot(x.get(), y.get(), true);
      if (best) dock(best.id);
    }, IDLE_RETURN_MS);
  }

  return (
    <>
      <div ref={darkRef} aria-hidden className="cave-dark" />
      <div ref={warmRef} aria-hidden className="cave-warm" />
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={mode === "slotted" ? "Diya — drag to carry the light" : "Diya — drop it in a niche to light the page"}
        className={cn("cave-diya", mode === "carried" && "is-carried")}
        style={{ x, y }}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => {
          dragging.current = true;
          clearTimeout(idleTimer.current);
          slotId.current = null;
          setMode("carried");
          animate(radius, CARRY_RADIUS, { duration: reduce ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] });
        }}
        onDrag={() => {
          // magnetic pull: close to a niche, the diya is drawn towards it
          const best = nearestSlot(x.get(), y.get(), true);
          if (best && best.d < SNAP_DISTANCE) {
            const c = slotCenter(slots.get(best.id)!);
            const pull = (1 - best.d / SNAP_DISTANCE) * 0.25;
            x.set(x.get() + (c.x - x.get()) * pull);
            y.set(y.get() + (c.y - y.get()) * pull);
          }
        }}
        onDragEnd={() => {
          dragging.current = false;
          const best = nearestSlot(x.get(), y.get(), true);
          if (best && best.d < SNAP_DISTANCE) dock(best.id);
          else scheduleReturn();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
        }}
      >
        <DiyaGraphic />
      </motion.div>
    </>
  );
}

/** Brass diya bowl with the layered, swaying flame. Origin (0,0) of the wrapper = bowl centre. */
function DiyaGraphic() {
  return (
    <svg viewBox="0 0 60 70" className="pointer-events-none block h-[70px] w-[60px] -translate-x-1/2 -translate-y-[62%]" aria-hidden>
      <defs>
        <radialGradient id="diya-bowl" cx="50%" cy="20%" r="80%">
          <stop offset="0" stopColor="#f3c27a" />
          <stop offset="0.45" stopColor="#c47b2b" />
          <stop offset="1" stopColor="#6b3410" />
        </radialGradient>
        <linearGradient id="diya-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0a03a" />
          <stop offset="1" stopColor="#c2501d" />
        </linearGradient>
        <linearGradient id="diya-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc457" />
          <stop offset="1" stopColor="#ea8a2c" />
        </linearGradient>
        <filter id="diya-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse cx="30" cy="26" rx="10" ry="13" fill="#f4a93c" opacity="0.45" filter="url(#diya-glow)" className="flame-halo" />
      <g className="flame-body">
        <path d="M30 6 C 36 13, 37.5 20, 34 26 C 32.8 28, 31.4 29.6, 30 32 C 28.6 29.6, 27.2 28, 26 26 C 22.5 20, 24 13, 30 6 Z" fill="url(#diya-outer)" className="flame-l1" />
        <path d="M30 11 C 34.4 16, 35 21, 32.6 25.4 C 31.7 27, 30.8 28.4, 30 30.6 C 29.2 28.4, 28.3 27, 27.4 25.4 C 25 21, 25.6 16, 30 11 Z" fill="url(#diya-mid)" className="flame-l2" />
        <path d="M30 17 C 32.4 20, 32.7 23, 31.3 26 C 30.8 27, 30.4 28, 30 29.3 C 29.6 28, 29.2 27, 28.7 26 C 27.3 23, 27.6 20, 30 17 Z" fill="#fff2bf" className="flame-l3" />
      </g>
      {/* bowl: wick sits behind the rim */}
      <path d="M6 36 C 10 50, 20 56, 30 56 C 40 56, 50 50, 54 36 C 46 40, 38 41, 30 41 C 22 41, 14 40, 6 36 Z" fill="url(#diya-bowl)" />
      <path d="M6 36 C 14 40, 22 41, 30 41 C 38 41, 46 40, 54 36" fill="none" stroke="#f6d39a" strokeWidth="1.2" opacity="0.8" />
      <ellipse cx="30" cy="60" rx="9" ry="2.5" fill="#6b3410" opacity="0.8" />
    </svg>
  );
}
