"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** Days-to-go that rolls up digit by digit like a flip clock when the portal opens. */
export function FlipCountdown({ days }: { days: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? days : 0);

  useEffect(() => {
    if (reduce) return setShown(days);
    const start = Date.now();
    const duration = 1300;
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(days * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 45);
    return () => clearInterval(t);
  }, [days, reduce]);

  const digits = String(shown).padStart(String(days).length, "0").split("");
  return (
    <span className="inline-flex font-serif text-6xl font-semibold tabular" aria-label={`${days} days`}>
      {digits.map((d, i) => (
        <span key={i} className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden text-center">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={d}
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-0"
              aria-hidden
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
