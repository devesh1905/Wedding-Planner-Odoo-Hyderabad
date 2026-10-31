"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils";
import { flameState, ShaderFlame } from "./shader-flame";

/**
 * Cave mode (couples' home, dark theme only).
 *
 * One light — the diya's flame — drives everything. A single animation loop owns all motion:
 * every frame the diya eases toward ONE live target (the pointer while dragging, the niche's
 * current on-screen position while docked or gliding, or where it was dropped), so there are no
 * competing animations, no stale targets and nothing to get stuck.
 *
 * From the flame position + light radius the loop also updates:
 *  • darkness that falls off with distance (soft core, long tail)
 *  • a warm firelight tint
 *  • drop-shadows on every [data-cast] element, pointing away from the flame
 *  • a gentle flicker shared by light and shadows
 *
 * Docked in a niche = the page's light is on. Grab it = the room dims and it becomes a lamp you
 * carry. Near a niche it's pulled in. Scrolling glides it to the niche nearest mid-screen.
 */

const slots = new Map<string, HTMLElement>();
const CARRY_RADIUS = 230;
const SNAP_DISTANCE = 120;
const IDLE_RETURN_MS = 6000;
// Follow speeds (per second) for exponential easing: higher = snappier.
const FOLLOW_DRAG = 28;
const FOLLOW_GLIDE = 6.5;
const FOLLOW_RADIUS = 4.5;

export function DiyaSlot({ id, className, label = "Place the diya here" }: { id: string; className?: string; label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    slots.set(id, ref.current!);
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

// smooth 1D noise for flicker (sum of incommensurate sines — cheap, never visibly repeats)
const flicker = (t: number) => 0.5 * Math.sin(t * 2.1) + 0.3 * Math.sin(t * 5.3 + 1.7) + 0.2 * Math.sin(t * 11.7 + 0.4);
const ease = (k: number, dt: number) => 1 - Math.exp(-k * dt);

// Phones and touch tablets: the diya rests in a fixed corner dock instead of following niches as the
// page scrolls (touch scrolling runs off the main thread, so chasing niches made it lag and jump).
const PHONE_QUERY = "(max-width: 767px), (pointer: coarse)";
const HOME = "home";
const homePos = () => {
  const h = window.visualViewport?.height ?? innerHeight;
  return { x: innerWidth - 40, y: h - 64 };
};

function slotCenter(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 };
}

function nearestSlot(px: number, py: number, visibleOnly: boolean) {
  let best: { id: string; d: number } | null = null;
  for (const [id, el] of slots) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const c = slotCenter(el);
    // only niches comfortably on screen count as visible
    if (visibleOnly && (c.y < 70 || c.y > innerHeight - 70 || c.x < 0 || c.x > innerWidth)) continue;
    const d = Math.hypot(c.x - px, c.y - py);
    if (!best || d < best.d) best = { id, d };
  }
  return best;
}

export function CaveMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setDark(html.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark ? <Cave /> : null;
}

type Mode = "docked" | "gliding" | "dragging" | "carried";

function Cave() {
  const diyaRef = useRef<HTMLDivElement>(null);
  // Hint on every visit to the page: "grab" while docked, "drop" while carrying. It waits for the
  // splash to finish (so it is never hidden behind it) and fades by itself if nobody tries.
  const [hint, setHint] = useState<"grab" | "drop" | null>(null);
  const hintRef = useRef(hint);
  hintRef.current = hint;
  useEffect(() => {
    let show = 0;
    let hide = 0;
    const start = () => {
      show = window.setTimeout(() => setHint("grab"), 900);
      hide = window.setTimeout(() => hintRef.current === "grab" && setHint(null), 9900);
    };
    // the splash is the only element with this class; poll until it has gone
    const wait = window.setInterval(() => {
      if (!document.querySelector(".splash")) {
        window.clearInterval(wait);
        start();
      }
    }, 200);
    return () => {
      window.clearInterval(wait);
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);
  // All live state lives in one ref, read and written only by the loop and event handlers.
  const s = useRef({
    mode: "gliding" as Mode,
    slotId: null as string | null,
    x: -100,
    y: -100,
    tx: -100,
    ty: -100,
    vx: 0,
    radius: CARRY_RADIUS,
    radiusTarget: CARRY_RADIUS,
    pointer: { x: 0, y: 0, ox: 0, oy: 0 },
    idleTimer: 0,
    placed: false,
  });

  useEffect(() => {
    const st = s.current;
    const html = document.documentElement;
    const diya = diyaRef.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = matchMedia(PHONE_QUERY).matches;
    const target = (id: string) => (id === HOME ? homePos() : slotCenter(slots.get(id)!));
    // docked light reaches well past the far edge, so the whole page is readable
    const bigRadius = () => Math.hypot(innerWidth, innerHeight) * 2.6;

    const goToSlot = (id: string) => {
      if (id !== HOME && !slots.has(id)) return;
      clearTimeout(st.idleTimer);
      st.slotId = id;
      st.mode = "gliding";
      diya.classList.remove("is-carried");
    };
    const goToNearest = () => {
      if (phone) return goToSlot(HOME);
      const best = nearestSlot(innerWidth / 2, innerHeight / 2, true) ?? nearestSlot(innerWidth / 2, innerHeight / 2, false);
      if (best) goToSlot(best.id);
    };

    // ── pointer: grab, carry, drop ──
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      if (hintRef.current === "grab") setHint("drop");
      // can throw if the touch already ended (very quick taps); dragging still works without it
      try {
        diya.setPointerCapture(e.pointerId);
      } catch {}
      clearTimeout(st.idleTimer);
      st.mode = "dragging";
      st.slotId = null;
      st.radiusTarget = CARRY_RADIUS;
      st.pointer = { x: e.clientX, y: e.clientY, ox: st.x - e.clientX, oy: st.y - e.clientY };
      diya.classList.add("is-carried");
    };
    const onMove = (e: PointerEvent) => {
      if (st.mode !== "dragging") return;
      st.pointer.x = e.clientX;
      st.pointer.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (st.mode !== "dragging") return;
      diya.releasePointerCapture?.(e.pointerId);
      if (hintRef.current === "drop") setTimeout(() => setHint(null), 1200);
      if (phone) {
        const h = homePos();
        if (Math.hypot(h.x - st.x, h.y - st.y) < SNAP_DISTANCE) return goToSlot(HOME);
      } else {
        const best = nearestSlot(st.x, st.y, true);
        if (best && best.d < SNAP_DISTANCE) return goToSlot(best.id);
      }
      st.mode = "carried";
      st.tx = st.x;
      st.ty = st.y;
      st.idleTimer = window.setTimeout(() => st.mode === "carried" && goToNearest(), IDLE_RETURN_MS);
    };
    diya.addEventListener("pointerdown", onDown);
    diya.addEventListener("pointermove", onMove);
    diya.addEventListener("pointerup", onUp);
    diya.addEventListener("pointercancel", onUp);

    // ── scroll: glide to the niche nearest mid-screen (never while dragging) ──
    let scrollQueued = false;
    const onScroll = () => {
      if (scrollQueued) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        if (st.mode === "dragging" || phone) return;
        const best = nearestSlot(innerWidth / 2, innerHeight / 2, true);
        if (best && best.id !== st.slotId) goToSlot(best.id);
      });
    };
    const onSlot = (e: Event) => goToSlot((e as CustomEvent<string>).detail);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.closest("input,textarea")) return;
      if (st.mode === "docked" || st.mode === "gliding") {
        st.mode = "carried";
        st.slotId = null;
        st.tx = st.x;
        st.ty = st.y;
        diya.classList.add("is-carried");
      } else goToNearest();
    };
    addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => {
      wrote = false;
    };
    window.visualViewport?.addEventListener("resize", onResize);
    addEventListener("diya:slot", onSlot);
    addEventListener("keydown", onKey);

    // ── the loop ──
    let raf = 0;
    let last = performance.now();
    let casters: HTMLElement[] = [];
    let lastScan = 0;
    let wrote = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // first frame: start already sitting in the top-most niche
      if (!st.placed) {
        const first = phone ? { id: HOME } : nearestSlot(innerWidth / 2, 0, true) ?? nearestSlot(innerWidth / 2, 0, false);
        if (first) {
          const c = target(first.id);
          st.x = st.tx = c.x;
          st.y = st.ty = c.y;
          st.slotId = first.id;
          st.mode = "docked";
          st.radius = st.radiusTarget = bigRadius();
          st.placed = true;
        }
      }

      // target for this frame
      let k = FOLLOW_GLIDE;
      if (st.mode === "dragging") {
        st.tx = st.pointer.x + st.pointer.ox;
        st.ty = st.pointer.y + st.pointer.oy;
        // magnetic: near a niche (or the phone dock), the diya is drawn into it
        const best = phone
          ? { id: HOME, d: Math.hypot(homePos().x - st.tx, homePos().y - st.ty) }
          : nearestSlot(st.tx, st.ty, true);
        if (best && best.d < SNAP_DISTANCE) {
          const c = target(best.id);
          const pull = Math.pow(1 - best.d / SNAP_DISTANCE, 2) * 0.6;
          st.tx += (c.x - st.tx) * pull;
          st.ty += (c.y - st.ty) * pull;
        }
        k = FOLLOW_DRAG;
      } else if (st.slotId && (st.slotId === HOME || slots.has(st.slotId))) {
        const c = target(st.slotId); // live position, follows scrolling
        st.tx = c.x;
        st.ty = c.y;
        k = st.mode === "docked" ? 40 : FOLLOW_GLIDE;
      }

      const px = st.x;
      const a = reduce ? 1 : ease(k, dt);
      st.x += (st.tx - st.x) * a;
      st.y += (st.ty - st.y) * a;
      st.vx = dt > 0 ? (st.x - px) / dt : 0;

      // arrived in a niche → light switch on
      if (st.mode === "gliding" && Math.hypot(st.tx - st.x, st.ty - st.y) < 2) st.mode = "docked";
      st.radiusTarget = st.mode === "docked" ? bigRadius() : st.mode === "gliding" ? bigRadius() * 0.45 : CARRY_RADIUS;
      st.radius += (st.radiusTarget - st.radius) * (reduce ? 1 : ease(FOLLOW_RADIUS, dt));

      // draw the diya; the flame leans against the direction of travel
      const lean = Math.max(-18, Math.min(18, -st.vx * 0.02));
      diya.style.transform = `translate3d(${st.x - 36}px, ${st.y - 62}px, 0)`;
      diya.style.setProperty("--lean", `${lean.toFixed(1)}deg`);
      flameState.lean = (lean / 18) * 0.6;

      // Phone: once settled, nothing moves — skip the frame's style writes entirely.
      const settled = Math.abs(st.tx - st.x) < 0.3 && Math.abs(st.ty - st.y) < 0.3 && Math.abs(st.radiusTarget - st.radius) < 1;
      if (phone && settled && st.mode !== "dragging" && wrote) {
        raf = requestAnimationFrame(tick);
        return;
      }
      wrote = true;

      // light (no flicker on phones: repainting a full-screen gradient every frame is what lagged)
      const t = now / 1000;
      const f = reduce || phone ? 0 : flicker(t);
      const lx = st.x - 24 + f * 1.2; // the flame sits on the wick at the spout (left of centre)
      const ly = st.y - 30 + flicker(t + 9) * (reduce || phone ? 0 : 1.2);
      const r = st.radius * (1 + f * 0.05);
      html.style.setProperty("--lx", `${lx.toFixed(1)}px`);
      html.style.setProperty("--ly", `${ly.toFixed(1)}px`);
      html.style.setProperty("--lr", `${r.toFixed(1)}px`);
      html.style.setProperty("--li", `${(0.9 + f * 0.08).toFixed(3)}`);

      // shadows (desktop only: a drop-shadow per element per frame is too heavy for phones)
      if (phone) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (now - lastScan > 800) {
        casters = Array.from(document.querySelectorAll<HTMLElement>("[data-cast]"));
        lastScan = now;
      }
      const lit = r > CARRY_RADIUS * 2;
      for (const el of casters) {
        const b = el.getBoundingClientRect();
        if (b.bottom < -50 || b.top > innerHeight + 50) continue;
        const dx = b.left + b.width / 2 - lx;
        const dy = b.top + b.height / 2 - ly;
        const d = Math.max(1, Math.hypot(dx, dy));
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
      clearTimeout(st.idleTimer);
      diya.removeEventListener("pointerdown", onDown);
      diya.removeEventListener("pointermove", onMove);
      diya.removeEventListener("pointerup", onUp);
      diya.removeEventListener("pointercancel", onUp);
      removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onResize);
      removeEventListener("diya:slot", onSlot);
      removeEventListener("keydown", onKey);
      for (const el of document.querySelectorAll<HTMLElement>("[data-cast]")) el.style.filter = "";
      for (const p of ["--lx", "--ly", "--lr", "--li"]) html.style.removeProperty(p);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="cave-dark" />
      <div aria-hidden className="cave-warm" />
      <div
        ref={diyaRef}
        role="button"
        tabIndex={0}
        aria-label="Diya — drag to carry the light, drop it in a niche to light the page (or press L)"
        className="cave-diya"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
          }
        }}
      >
        <DiyaGraphic />
        {hint && (
          <span key={hint} role="status" className="diya-hint">
            {hint === "grab" ? "Hold & drag to carry the light" : "Drop it into a niche to light the page"}
          </span>
        )}
      </div>
    </>
  );
}

/**
 * HD brass diya (photo, transparent PNG) with a live WebGL flame on the wick tip (vector flame as fallback).
 * Element box 72×96: bowl image at the bottom, flame above the spout. The flame leans with --lean.
 */
function DiyaGraphic() {
  return (
    <>
      <span className="diya-flame-glow" aria-hidden />
      <ShaderFlame
        className="diya-flame-gl"
        state={flameState}
        fallback={
      <svg viewBox="20 4 20 30" className="diya-flame" aria-hidden>
        <defs>
          <linearGradient id="diya-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0a03a" />
            <stop offset="1" stopColor="#c2501d" />
          </linearGradient>
          <linearGradient id="diya-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffc457" />
            <stop offset="1" stopColor="#ea8a2c" />
          </linearGradient>
        </defs>
        <g className="diya-lean">
          <g className="flame-body">
            <path d="M30 6 C 36 13, 37.5 20, 34 26 C 32.8 28, 31.4 29.6, 30 32 C 28.6 29.6, 27.2 28, 26 26 C 22.5 20, 24 13, 30 6 Z" fill="url(#diya-outer)" className="flame-l1" />
            <path d="M30 11 C 34.4 16, 35 21, 32.6 25.4 C 31.7 27, 30.8 28.4, 30 30.6 C 29.2 28.4, 28.3 27, 27.4 25.4 C 25 21, 25.6 16, 30 11 Z" fill="url(#diya-mid)" className="flame-l2" />
            <path d="M30 17 C 32.4 20, 32.7 23, 31.3 26 C 30.8 27, 30.4 28, 30 29.3 C 29.6 28, 29.2 27, 28.7 26 C 27.3 23, 27.6 20, 30 17 Z" fill="#fff2bf" className="flame-l3" />
          </g>
        </g>
      </svg>
        }
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/diya-bowl.png" srcSet="/brand/diya-bowl.png 1x, /brand/diya-bowl@2x.png 2x" alt="" draggable={false} className="diya-bowl" />
    </>
  );
}
