"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

// Theme "moodboards" rendered from gradients and pattern — no stock photos.
const THEMES = [
  { name: "Royal Heritage", place: "City Palace, Udaipur", palette: ["#5c1a24", "#b8862b", "#f3e3c3"], motif: "arches" },
  { name: "Pastel Garden", place: "Rambagh, Jaipur", palette: ["#e9b8b4", "#c9d8b6", "#fbf3ea"], motif: "petals" },
  { name: "Desert Boho", place: "Suryagarh, Jaisalmer", palette: ["#b5643c", "#e2b07a", "#f4e6d4"], motif: "dunes" },
  { name: "Lakeside Ivory", place: "Lake Pichola, Udaipur", palette: ["#1f5f5b", "#9fc3bd", "#f6f1e6"], motif: "waves" },
  { name: "Mehendi Marigold", place: "Samode Haveli, Jaipur", palette: ["#e8a33d", "#7a1f2b", "#fdf1d8"], motif: "petals" },
  { name: "Modern Minimal", place: "Leela Palace, Udaipur", palette: ["#2b2622", "#cfc6b8", "#faf8f3"], motif: "lines" },
];

function Motif({ kind, color }: { kind: string; color: string }) {
  const common = { stroke: color, strokeWidth: 1.2, fill: "none", opacity: 0.55 };
  if (kind === "arches")
    return (
      <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full">
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${10 + i * 48} 120 V70 a22 22 0 0 1 44 0 V120`} {...common} />
        ))}
      </svg>
    );
  if (kind === "dunes")
    return (
      <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full">
        <path d="M0 90 Q50 60 100 85 T200 75" {...common} />
        <path d="M0 105 Q60 80 120 100 T200 95" {...common} />
      </svg>
    );
  if (kind === "waves")
    return (
      <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full">
        {[80, 92, 104].map((y) => (
          <path key={y} d={`M0 ${y} q12 -8 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0`} {...common} />
        ))}
      </svg>
    );
  if (kind === "lines")
    return (
      <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full">
        {[30, 70, 110, 150].map((x) => (
          <line key={x} x1={x} y1="40" x2={x} y2="120" {...common} />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-x-0 bottom-0 w-full">
      {[30, 80, 130, 170].map((x, i) => (
        <ellipse key={x} cx={x} cy={80 + (i % 2) * 14} rx="10" ry="18" transform={`rotate(${i * 35} ${x} ${80 + (i % 2) * 14})`} {...common} />
      ))}
    </svg>
  );
}

const VIEW_KEY = "knot:celebrations-view";
type View = "wander" | "scan";

function Card({ t, className }: { t: (typeof THEMES)[number]; className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] ${className}`}
      style={{ background: `linear-gradient(160deg, ${t.palette[2]} 0%, ${t.palette[1]} 55%, ${t.palette[0]} 100%)` }}
    >
      <Motif kind={t.motif} color={t.palette[2]} />
      <div className="absolute inset-x-0 top-0 flex gap-1.5 p-5">
        {t.palette.map((c) => (
          <span key={c} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.25)]">
        <p className="font-serif text-3xl font-semibold">{t.name}</p>
        <p className="text-sm opacity-90">{t.place}</p>
      </div>
    </div>
  );
}

/**
 * Drag-to-explore strip of celebration styles. A contextual cursor ("Drag") follows the pointer
 * over the strip so people know what to do before they try.
 */
export function Celebrations() {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<View>("wander");
  const cx = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });
  const cy = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "scan" || saved === "wander") setView(saved);
    } catch {}
  }, []);

  const choose = (v: View) => {
    setView(v);
    setHover(false);
    setDragging(false);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const glide = { layout: { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section id="celebrations" className="py-24" aria-label="Celebration styles">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs tracking-[0.3em] text-eyebrow uppercase">Celebrations</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl text-4xl leading-tight font-semibold sm:text-5xl">Every wedding has its own light</h2>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div role="group" aria-label="Celebrations view" className="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
              {(["wander", "scan"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => choose(v)}
                  className={`rounded-full px-4 py-1.5 capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    view === v ? "bg-cta text-cta-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="max-w-sm text-muted-foreground sm:text-right">
              Six moods our couples keep coming back to. {view === "wander" ? "Drag to wander through them." : "Scan them all at a glance."}
            </p>
          </div>
        </div>
      </div>

      <LayoutGroup id="celebrations-cards">
      {view === "scan" ? (
        <ul className="mx-auto mt-12 grid max-w-6xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <motion.li key={t.name} layoutId={`celebration-${t.name}`} transition={glide} className="select-none">
              <Card t={t} className="h-[22rem] w-full" />
            </motion.li>
          ))}
        </ul>
      ) : (

      <div
        ref={track}
        className="relative mt-12 overflow-hidden md:cursor-none"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onPointerMove={(e) => {
          const r = track.current!.getBoundingClientRect();
          cx.set(e.clientX - r.left);
          cy.set(e.clientY - r.top);
        }}
      >
        <motion.ul
          drag={reduce ? false : "x"}
          dragConstraints={track}
          dragElastic={0.08}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          className="flex w-max gap-5 px-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
        >
          {THEMES.map((t) => (
            <motion.li key={t.name} layoutId={`celebration-${t.name}`} transition={glide} className="select-none">
              <Card t={t} className="h-[24rem] w-[17rem] sm:w-[19rem]" />
            </motion.li>
          ))}
        </motion.ul>

        {hover && !reduce && (
          <motion.div
            aria-hidden
            style={{ x: cx, y: cy }}
            className="pointer-events-none absolute top-0 left-0 hidden md:block"
          >
            <span
              className={`-translate-x-1/2 -translate-y-1/2 grid size-20 place-items-center rounded-full bg-cta text-xs font-medium tracking-[0.2em] text-cta-foreground uppercase shadow-lg transition-transform duration-200 ${dragging ? "scale-75" : "scale-100"}`}
            >
              Drag
            </span>
          </motion.div>
        )}
      </div>
      )}
      </LayoutGroup>
    </section>
  );
}
