"use client";

import { motion, useReducedMotion } from "framer-motion";

/** A maroon wax seal with the knot pressed into it — stamped onto the signed agreement. */
export function WaxSeal({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { scale: 1.9, rotate: -24, opacity: 0, y: -30 }}
      animate={{ scale: [1.9, 0.92, 1], rotate: [-24, 4, -6], opacity: 1, y: 0 }}
      transition={{ duration: 0.75, times: [0, 0.7, 1], ease: [0.2, 0.9, 0.3, 1] }}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" className="size-full drop-shadow-[0_6px_10px_rgb(60_10_20/0.35)]">
        <defs>
          <radialGradient id="wax" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#a8323f" />
            <stop offset="0.6" stopColor="#7a1f2b" />
            <stop offset="1" stopColor="#4d1018" />
          </radialGradient>
        </defs>
        {/* irregular wax edge */}
        <path
          d="M60 6c9 0 12 6 20 8s15-1 19 6 1 12 5 19 10 9 9 18-8 10-8 18 5 13 0 19-12 3-18 8-7 12-16 13-12-6-20-7-15 3-20-4-2-12-7-18-11-8-11-17 7-11 6-19-6-13 0-19 13-2 19-7 8-11 16-11c4-1 8-1 6-1Z"
          fill="url(#wax)"
        />
        <circle cx="60" cy="60" r="34" fill="none" stroke="#5a141d" strokeWidth="2" opacity="0.6" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="#c4555f" strokeWidth="0.8" opacity="0.5" />
        {/* embossed knot + flame */}
        <g transform="translate(31 42) scale(0.58)" opacity="0.9">
          <path
            d="M50 34 C 40 22, 26 16, 15 21 C 5 26, 6 42, 17 45 C 29 48, 40 41, 50 34 C 60 27, 71 20, 83 23 C 94 26, 95 42, 85 45 C 74 49, 60 42, 50 34 Z"
            fill="none"
            stroke="#e9a6a9"
            strokeOpacity="0.55"
            strokeWidth="4"
          />
          <path d="M50 4 C 58 13, 60 22, 55 29 C 53 31.4, 51.6 32.8, 50 34.6 C 48.4 32.8, 47 31.4, 45 29 C 40 22, 42 13, 50 4 Z" fill="#e9a6a9" fillOpacity="0.5" />
        </g>
      </svg>
    </motion.div>
  );
}
