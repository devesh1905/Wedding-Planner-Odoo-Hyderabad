"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts up to the numeric part of `value` once it scrolls into view, easing out.
 * "25" -> 25, "1 day" -> 1 + " day". Values without a number render as-is.
 * `from` sets the starting number (e.g. 9 to count down to 0).
 */
export function NumberTicker({
  value,
  prefix = "",
  suffix = "",
  from = 0,
  duration = 1.4,
  className,
}: {
  value: string | number;
  prefix?: string;
  suffix?: string;
  from?: number;
  duration?: number;
  className?: string;
}) {
  const text = String(value);
  const match = text.match(/^(\D*?)(\d+(?:\.\d+)?)(.*)$/s);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const target = match ? Number(match[2]) : 0;
  const decimals = match?.[2].split(".")[1]?.length ?? 0;
  // Server render and reduced-motion show the final value; the count starts after mount.
  const [n, setN] = useState(target);

  useEffect(() => {
    if (!match || reduce) return;
    setN(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, from, text]);

  useEffect(() => {
    if (!match || reduce || !inView) return;
    const controls = animate(from, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, from, target, duration]);

  if (!match) {
    return (
      <span className={className}>
        {prefix}
        {text}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={`tabular ${className ?? ""}`}>
      {prefix}
      {match[1]}
      {n.toFixed(decimals)}
      {match[3]}
      {suffix}
    </span>
  );
}
