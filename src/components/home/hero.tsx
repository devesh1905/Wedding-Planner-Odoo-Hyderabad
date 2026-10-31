"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Magnetic } from "./magnetic";
import { KnotMark } from "./knot-mark";

/**
 * The page's one animated moment: a slow aurora of marigold, rose and gold behind the headline.
 * The ornament drifts a little slower than the page (controlled parallax) — felt more than seen.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, [0, 600], [0, 90]);
  const fade = useTransform(scrollY, [0, 500], [1, 0.4]);

  return (
    <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <span className="aurora-a" />
        <span className="aurora-b" />
        <span className="aurora-c" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" aria-hidden />

      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: drift, opacity: fade }}
        className="pointer-events-none absolute top-1/2 right-[-6rem] -z-10 hidden -translate-y-1/2 text-maroon/[0.07] lg:block"
      >
        <KnotMark className="h-[34rem] w-[56rem]" flameClassName="opacity-25" effects={false} />
      </motion.div>

      <div className="mx-auto w-full max-w-6xl px-6 py-28">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xs tracking-[0.35em] text-maroon uppercase"
        >
          Luxury weddings · Jaipur & Udaipur
        </motion.p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-4xl text-6xl leading-[0.95] font-semibold sm:text-7xl lg:text-8xl"
        >
          Three days. Four hundred guests. Not one thing forgotten.
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/75"
        >
          We plan around twenty-five weddings a season — each with its own team, its own timeline and a clear view of every rupee.
          You get the calm. We carry the details.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mt-10 flex flex-wrap items-center gap-5"
        >
          <Magnetic>
            <Link
              href="/enquire"
              className="group inline-flex items-center gap-3 rounded-full bg-maroon px-8 py-4 text-base font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.38_0.12_18/0.6)] transition-colors hover:bg-[oklch(0.33_0.12_18)]"
            >
              Plan your wedding
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <a href="#journey" className="text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            See how it works
          </a>
        </motion.div>
      </div>
    </section>
  );
}
