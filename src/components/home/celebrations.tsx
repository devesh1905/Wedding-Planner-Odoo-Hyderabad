"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

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

/**
 * Drag-to-explore strip of celebration styles. A contextual cursor ("Drag") follows the pointer
 * over the strip so people know what to do before they try.
 */
export function Celebrations() {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cx = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });
  const cy = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });

  return (
    <section id="celebrations" className="py-24" aria-label="Celebration styles">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs tracking-[0.3em] text-maroon uppercase">Celebrations</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl text-4xl leading-tight font-semibold sm:text-5xl">Every wedding has its own light</h2>
          <p className="max-w-sm text-muted-foreground">Six moods our couples keep coming back to. Drag to wander through them.</p>
        </div>
      </div>

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
            <li key={t.name} className="select-none">
              <div
                className="relative h-[24rem] w-[17rem] overflow-hidden rounded-[28px] sm:w-[19rem]"
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
            </li>
          ))}
        </motion.ul>

        {hover && !reduce && (
          <motion.div
            aria-hidden
            style={{ x: cx, y: cy }}
            className="pointer-events-none absolute top-0 left-0 hidden md:block"
          >
            <span
              className={`-translate-x-1/2 -translate-y-1/2 grid size-20 place-items-center rounded-full bg-maroon text-xs font-medium tracking-[0.2em] text-primary-foreground uppercase shadow-lg transition-transform duration-200 ${dragging ? "scale-75" : "scale-100"}`}
            >
              Drag
            </span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
