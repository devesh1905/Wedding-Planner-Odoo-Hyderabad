"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/frontend/components/icons/icon";
import { Magnetic } from "./magnetic";
import { KnotMark } from "./knot-mark";
import { DiyaSlot } from "@/frontend/components/cave/cave-mode";

/**
 * The page's one ambient moment: a slow aurora of marigold, rose and gold behind the headline.
 * (The parallax ornament was removed so the aurora reads as the single moment.)
 */
export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" aria-hidden />

      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-[-6rem] -z-10 hidden -translate-y-1/2 text-foreground/[0.06] lg:block"
      >
        <KnotMark className="h-[34rem] w-[56rem]" flameClassName="opacity-25" effects={false} />
      </div>

      <DiyaSlot id="hero" className="absolute top-[26%] right-[9%] z-10" />
      <div className="mx-auto w-full max-w-6xl px-6 py-28">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xs tracking-[0.35em] text-eyebrow uppercase"
        >
          Luxury weddings · Jaipur & Udaipur
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          data-cast
          className="mt-6 text-[clamp(2.6rem,7vw,5.75rem)] leading-[0.98] font-semibold"
        >
          {/* one thought per line: the rhythm is the message */}
          <span className="block sm:whitespace-nowrap">Three days.</span>
          <span className="block sm:whitespace-nowrap">Four hundred guests.</span>
          <span className="block sm:whitespace-nowrap">Not one thing forgotten.</span>
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          data-cast
          className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/75"
        >
          We plan around twenty-five weddings a season — each with its own team, its own timeline and a clear view of every rupee.
          You get the calm. We carry the details.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          data-cast
          className="mt-10 flex flex-wrap items-center gap-5"
        >
          <Magnetic>
            <ViewTransition name="enquiry-card" share="morph" default="none">
            <Link
              href="/enquire"
              className="group inline-flex items-center gap-3 rounded-full bg-cta px-8 py-4 text-base font-medium text-cta-foreground shadow-[0_10px_30px_-10px_oklch(0.38_0.12_18/0.6)] transition-colors hover:bg-cta/90"
            >
              Plan your wedding
              <Icon name="arrow" className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            </ViewTransition>
          </Magnetic>
          <a href="#journey" className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            <Icon name="route" />See how it works
          </a>
        </motion.div>
      </div>
    </section>
  );
}
