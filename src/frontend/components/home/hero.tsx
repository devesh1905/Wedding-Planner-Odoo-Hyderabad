"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/frontend/components/icons/icon";
import { Magnetic } from "./magnetic";
import { DiyaSlot } from "@/frontend/components/cave/cave-mode";

/**
 * The page's one ambient moment: a slow aurora of marigold, rose and gold behind the headline.
 * (The parallax ornament was removed so the aurora reads as the single moment.)
 */
export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" aria-hidden />

      <DiyaSlot id="hero" className="absolute top-[26%] right-[9%] z-10" />
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 pb-10 sm:pt-28">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          data-cast
          className="text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.98] font-semibold"
        >
          {/* one thought per line: the rhythm is the message */}
          <span className="block sm:whitespace-nowrap">Three days.</span>
          <span className="block sm:whitespace-nowrap">Four hundred guests.</span>
          <span className="block sm:whitespace-nowrap">Not one thing forgotten.</span>
        </motion.h1>
        {/* editorial stack: headline, then the sentence and the actions on one line, then the picture
            full width — no column is left waiting for a taller neighbour */}
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            data-cast
            className="max-w-[34rem] text-lg leading-relaxed text-pretty text-foreground/75"
          >
            Twenty-five palace weddings a season in Jaipur and Udaipur, each with its own team and a clear view of every rupee.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            data-cast
            className="flex shrink-0 flex-wrap items-center gap-5"
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
            <a
              href="#journey"
              className="hit-44 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
            >
              <Icon name="route" />
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.figure
          className="mt-10"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="squircle overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgb(60_20_10/0.55)] ring-1 ring-marigold/25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wedding-pheras-1536.jpg"
              srcSet="/brand/wedding-pheras-960.jpg 960w, /brand/wedding-pheras-1536.jpg 1536w"
              sizes="(min-width: 1200px) 72rem, 100vw"
              width={1536}
              height={1024}
              alt="A bride in maroon and a groom in ivory walk around the sacred fire in a palace courtyard at dusk"
              className="aspect-[4/3] w-full object-cover object-[55%_60%] sm:aspect-[21/9] lg:aspect-[3/1]"
              fetchPriority="high"
            />
          </div>
          {/* generated image: labelled so nobody mistakes it for a past client's wedding */}
          <figcaption className="mt-2 text-[11px] text-muted-foreground">The pheras, at dusk · Illustrative image</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
