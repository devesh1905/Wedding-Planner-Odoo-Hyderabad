"use client";

import { motion, useReducedMotion } from "framer-motion";

/** A tick that draws itself when it scrolls into view — used for paid milestones. */
export function CheckDraw({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <motion.path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay, ease: "easeOut" }}
      />
    </svg>
  );
}
