"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { DiyaSlot } from "@/frontend/components/cave/cave-mode";
import { Icon, type IconName } from "@/frontend/components/icons/icon";

const CHAPTERS = [
  { n: "01", icon: "chat", title: "Tell us your dream", body: "A date, a guest count, a feeling. Share it once — your planner calls within a day, and nothing you said gets lost." },
  { n: "02", icon: "sign", title: "Sign from your phone", body: "Your service agreement arrives as a private link. Read it, sign with a finger, done. No printers, no couriers." },
  { n: "03", icon: "checklist", title: "A plan in a moment", body: "The day your booking is confirmed, every task from venue to vidaai appears — each with an owner and a date." },
  { n: "04", icon: "compare", title: "Vendors, compared honestly", body: "Three caterers, three different quotes, one clear table. Price per plate, what's included, what isn't." },
  { n: "05", icon: "clock", title: "The big day, held", body: "Minute by minute, every vendor checked in at the gate. If someone runs late, we know before you do." },
  { n: "06", icon: "wallet", title: "Every rupee, clear", body: "Extra guests, longer music — added fairly, shown to you for approval. Nothing paid twice, nothing forgotten." },
] satisfies { n: string; icon: IconName; title: string; body: string }[];

/**
 * "Your wedding, chapter by chapter": vertical scrolling drives a horizontal track while the
 * section is pinned — slows the reader down to take in the story. Falls back to a simple list
 * on small screens and for reduced motion.
 */
export function Chapters() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // The horizontal track only exists from md up; on phones the chapters simply stack.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-62%"]);

  return (
    <section ref={ref} id="journey" className="relative md:h-[260vh]" aria-label="How it works">
      {/* Snap stops through the pinned track (desktop only, see globals.css): start, two midpoints, end.
          The pinned range is 160vh; each mark is offset by the header padding so it lands exactly on it. */}
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden className="snap-mark pointer-events-none absolute left-0 h-px w-px" style={{ top: `calc(${(i * 160) / 3}vh + 4.5rem)` }} />
      ))}
      <div className="md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-center md:overflow-hidden">
        <div className="relative mx-auto w-full max-w-6xl px-6 pt-24 pb-10 md:pt-0">
          <DiyaSlot id="chapters" className="absolute right-6 bottom-6" />
          <p className="text-xs tracking-[0.3em] text-eyebrow uppercase">How it works</p>
          <h2 data-cast className="mt-3 max-w-xl text-4xl leading-tight font-semibold sm:text-5xl">Your wedding, chapter by chapter</h2>
        </div>
        <motion.ol
          style={reduce || !wide ? undefined : { x }}
          className="flex flex-col gap-4 px-6 pb-16 md:w-max md:flex-row md:gap-6 md:pb-0 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]"
        >
          {CHAPTERS.map((c) => (
            <li
              key={c.n}
              data-cast
              className="group squircle relative flex flex-col justify-between rounded-[28px] border border-border bg-surface p-8 text-foreground shadow-[0_1px_0_var(--border)] md:h-[22rem] md:w-[24rem]"
            >
              <div className="flex items-start justify-between">
                <span className="font-serif text-7xl leading-none font-semibold text-marigold/80 transition-colors group-hover:text-marigold">{c.n}</span>
                <Icon name={c.icon} className="size-10 text-eyebrow/80 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="text-3xl font-semibold">{c.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
