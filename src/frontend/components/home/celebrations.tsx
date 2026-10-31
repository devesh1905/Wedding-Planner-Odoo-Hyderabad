"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { DiyaSlot } from "@/frontend/components/cave/cave-mode";
import { Icon } from "@/frontend/components/icons/icon";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/frontend/components/ui/dialog";

// Celebration styles. Images are illustrative (generated, labelled on the page); the details are
// what a planner would tell a couple on the first call. Cost is per guest for full planning.
const THEMES = [
  {
    name: "Royal Heritage",
    slug: "royal-heritage",
    place: "City Palace, Udaipur",
    palette: ["#5c1a24", "#b8862b", "#f3e3c3"],
    motif: "arches",
    look: "A mandap under carved palace arches: maroon and gold drapes, brass urns, roses and marigolds, hundreds of diyas.",
    best: "Evening pheras and receptions · October to February",
    guests: "250–600 guests",
    venues: ["City Palace, Udaipur", "Rambagh Palace, Jaipur", "Samode Palace"],
    cost: "₹38k–45k",
  },
  {
    name: "Pastel Garden",
    slug: "pastel-garden",
    place: "Rambagh, Jaipur",
    palette: ["#e9b8b4", "#c9d8b6", "#fbf3ea"],
    motif: "petals",
    look: "A daytime lawn ceremony: blush and sage florals, peonies and wisteria, low pastel seating, soft morning light.",
    best: "Day ceremonies and mehendi · November to March",
    guests: "150–400 guests",
    venues: ["Rambagh Palace, Jaipur", "Fairmont Jaipur", "Raffles Udaipur"],
    cost: "₹28k–34k",
  },
  {
    name: "Desert Boho",
    slug: "desert-boho",
    place: "Suryagarh, Jaisalmer",
    palette: ["#b5643c", "#e2b07a", "#f4e6d4"],
    motif: "dunes",
    look: "A sangeet on the dunes at sunset: kilim rugs, terracotta cushions, pampas grass, lanterns and a fire pit.",
    best: "Sangeet and welcome dinners · November to February",
    guests: "100–350 guests",
    venues: ["Suryagarh, Jaisalmer", "Dune camps near Jaisalmer"],
    cost: "₹32k–40k",
  },
  {
    name: "Lakeside Ivory",
    slug: "lakeside-ivory",
    place: "Lake Pichola, Udaipur",
    palette: ["#1f5f5b", "#9fc3bd", "#f6f1e6"],
    motif: "waves",
    look: "An ivory mandap on a lakeside ghat at blue hour: white orchids and jasmine, sheer drapes, floating diyas.",
    best: "Pheras at dusk · October to March",
    guests: "150–400 guests",
    venues: ["Taj Lake Palace", "The Leela Palace Udaipur", "Raffles Udaipur"],
    cost: "₹36k–44k",
  },
  {
    name: "Mehendi Marigold",
    slug: "mehendi-marigold",
    place: "Samode Haveli, Jaipur",
    palette: ["#e8a33d", "#7a1f2b", "#fdf1d8"],
    motif: "petals",
    look: "A haveli courtyard dripping in marigold: mirror-work umbrellas, bolster seating, fuchsia and turquoise accents.",
    best: "Mehendi and haldi · all year (daytime)",
    guests: "100–300 guests",
    venues: ["Samode Haveli", "Samode Palace", "Rambagh Palace, Jaipur"],
    cost: "₹26k–30k",
  },
  {
    name: "Modern Minimal",
    slug: "modern-minimal",
    place: "Leela Palace, Udaipur",
    palette: ["#2b2622", "#cfc6b8", "#faf8f3"],
    motif: "lines",
    look: "A marble colonnade reception: long white-linen tables, slim brass candlesticks, single white lilies and greenery.",
    best: "Receptions and cocktail evenings · all year",
    guests: "150–500 guests",
    venues: ["The Leela Palace Udaipur", "Raffles Udaipur", "Fairmont Jaipur"],
    cost: "₹30k–36k",
  },
];

const VIEW_KEY = "knot:celebrations-view";
const LIGHT_KEY = "knot:celebrations-light";
type View = "wander" | "scan";
type Light = "day" | "night";

// A swag of fairy lights strung across the top of a card at night (sangeet-night mood).
function FairyLights() {
  const bulbs = Array.from({ length: 9 }, (_, i) => {
    const x = 12 + i * 22;
    return { x, y: 14 + 10 * Math.sin((i / 8) * Math.PI) };
  });
  return (
    <svg viewBox="0 0 200 40" className="absolute inset-x-0 top-0 w-full" aria-hidden>
      <path d="M2 10 Q100 40 198 10" fill="none" stroke="#3a2a22" strokeWidth="0.8" />
      {bulbs.map((b, i) => (
        <circle key={b.x} cx={b.x} cy={b.y} r="2.2" fill="#ffd27a" className="fairy-bulb" style={{ animationDelay: `${(i % 4) * 0.45}s` }} />
      ))}
    </svg>
  );
}

/**
 * One moodboard, lit two ways. Day = the palette in soft daylight; night = the same palette in
 * darkness, relit from below by firelight (a warm radial falloff) with fairy lights overhead.
 * Both layers are always rendered and cross-fade, so switching is a relight, not a re-render.
 */
function Card({ t, className, night, onOpen }: { t: (typeof THEMES)[number]; className: string; night: boolean; onOpen: () => void }) {
  return (
    <div data-cast className={`squircle relative overflow-hidden rounded-[28px] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/brand/theme-${t.slug}-800.jpg`}
        srcSet={`/brand/theme-${t.slug}-480.jpg 480w, /brand/theme-${t.slug}-800.jpg 800w`}
        sizes="(min-width: 640px) 20rem, 80vw"
        alt=""
        loading="lazy"
        draggable={false}
        className={`absolute inset-0 size-full object-cover transition-[filter] duration-700 ${night ? "brightness-[0.45] saturate-[0.85]" : ""}`}
      />
      {/* keeps the title readable over any photo */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity: night ? 1 : 0,
          background: `radial-gradient(120% 70% at 50% 108%, rgb(255 168 72 / 0.45) 0%, rgb(232 120 40 / 0.2) 35%, transparent 70%)`,
        }}
      >
        <div className="firelight absolute inset-0" style={{ background: "radial-gradient(90% 55% at 50% 110%, rgb(255 200 110 / 0.35), transparent 70%)" }} />
        <FairyLights />
      </div>
      <div className={`absolute inset-x-0 top-0 flex gap-1.5 p-5 transition-opacity duration-500 ${night ? "opacity-0" : "opacity-100"}`}>
        {t.palette.map((c) => (
          <span key={c} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">
        <p className="font-serif text-3xl font-semibold">{t.name}</p>
        <p className="text-sm opacity-90">{t.place}</p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          See details <Icon name="arrow" className="size-4" />
        </button>
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
  const [light, setLight] = useState<Light>("day");
  const [open, setOpen] = useState<(typeof THEMES)[number] | null>(null);
  // a drag that ends over a card fires a click too; ignore taps right after a drag
  const lastDrag = useRef(0);
  const openTheme = (t: (typeof THEMES)[number]) => {
    if (Date.now() - lastDrag.current > 250) setOpen(t);
  };
  const cx = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });
  const cy = useSpring(useMotionValue(0), { stiffness: 500, damping: 40 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "scan" || saved === "wander") setView(saved);
      // First visit: night if the site is in dark mode, so the moodboards match the cave.
      const lit = localStorage.getItem(LIGHT_KEY);
      setLight(lit === "day" || lit === "night" ? lit : document.documentElement.classList.contains("dark") ? "night" : "day");
    } catch {}
  }, []);

  const relight = (l: Light) => {
    setLight(l);
    try {
      localStorage.setItem(LIGHT_KEY, l);
    } catch {}
  };

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
      <div className="relative mx-auto max-w-6xl px-6">
        <DiyaSlot id="celebrations" className="absolute -top-20 right-6" />
        <p className="text-xs tracking-[0.3em] text-eyebrow uppercase">Celebrations</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 data-cast className="max-w-xl text-4xl leading-tight font-semibold sm:text-5xl">
            Every wedding has its own light
          </h2>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <div role="group" aria-label="Lighting" className="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
                {(["day", "night"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={light === l}
                    onClick={() => relight(l)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      light === l ? "bg-cta text-cta-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon name={l === "day" ? "sun" : "moon"} />
                    By {l}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Celebrations view" className="inline-flex rounded-full border border-border bg-surface p-1 text-sm">
                {(["wander", "scan"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => choose(v)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      view === v ? "bg-cta text-cta-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon name={v === "wander" ? "wander" : "grid"} />
                    {v}
                  </button>
                ))}
              </div>
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
                <Card t={t} night={light === "night"} className="h-[22rem] w-full" onOpen={() => openTheme(t)} />
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
              onDragEnd={() => {
                setDragging(false);
                lastDrag.current = Date.now();
              }}
              className="flex w-max gap-5 px-6 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
            >
              {THEMES.map((t) => (
                <motion.li key={t.name} layoutId={`celebration-${t.name}`} transition={glide} className="select-none">
                  <Card t={t} night={light === "night"} className="h-[24rem] w-[17rem] sm:w-[19rem]" onOpen={() => openTheme(t)} />
                </motion.li>
              ))}
            </motion.ul>

            {hover && !reduce && (
              <motion.div aria-hidden style={{ x: cx, y: cy }} className="pointer-events-none absolute top-0 left-0 hidden md:block">
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

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {open && (
          <DialogContent className="squircle max-h-[90svh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-2xl">
            <div className="grid sm:grid-cols-[minmax(0,15rem)_1fr]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brand/theme-${open.slug}-800.jpg`}
                  alt={`${open.name} wedding setup`}
                  className="aspect-[4/3] size-full object-cover sm:aspect-auto sm:h-full"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">Illustrative image</span>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <DialogTitle className="font-serif text-3xl">{open.name}</DialogTitle>
                  <DialogDescription className="mt-2 leading-relaxed">{open.look}</DialogDescription>
                </div>
                <div className="flex items-center gap-1.5" aria-label="Palette">
                  {open.palette.map((c) => (
                    <span key={c} className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                  ))}
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex gap-2.5">
                    <Icon name="calendar" className="mt-0.5 size-4 text-eyebrow" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Best for</dt>
                      <dd>{open.best}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Icon name="guests" className="mt-0.5 size-4 text-eyebrow" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Works for</dt>
                      <dd>{open.guests}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Icon name="pin" className="mt-0.5 size-4 text-eyebrow" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Venues we use</dt>
                      <dd>{open.venues.join(" · ")}</dd>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Icon name="wallet" className="mt-0.5 size-4 text-eyebrow" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Typical cost, full planning</dt>
                      <dd>
                        <span className="font-semibold">{open.cost}</span> per guest
                      </dd>
                    </div>
                  </div>
                </dl>
                <Link
                  href={`/enquire?theme=${encodeURIComponent(open.name)}`}
                  className="squircle inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cta text-base font-medium text-cta-foreground transition-colors hover:bg-cta/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Plan this style <Icon name="arrow" className="size-4" />
                </Link>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}
