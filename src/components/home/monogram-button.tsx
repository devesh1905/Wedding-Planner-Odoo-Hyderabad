"use client";

import { useRef } from "react";
import Link from "next/link";
import { cue } from "@/lib/sound";
import { KnotMark } from "./knot-mark";

/** Logo link with a small reward for the curious: three quick clicks shower marigold petals. */
export function MonogramButton() {
  const clicks = useRef<number[]>([]);

  async function onClick(e: React.MouseEvent) {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 900), now];
    if (clicks.current.length < 3) return;
    e.preventDefault();
    clicks.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const confetti = (await import("canvas-confetti")).default;
    const petal = confetti.shapeFromPath({ path: "M10 0 C16 6 16 14 10 20 C4 14 4 6 10 0Z" });
    cue("success", "subtle");
    for (const x of [0.2, 0.5, 0.8]) {
      confetti({
        particleCount: 40,
        spread: 70,
        startVelocity: 25,
        gravity: 0.6,
        scalar: 1.4,
        ticks: 260,
        origin: { x, y: -0.05 },
        angle: 270,
        shapes: [petal],
        colors: ["#e8a33d", "#f2b84b", "#d9822b", "#f6e7c8"],
      });
    }
  }

  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-3" aria-label="The Royal Knot — home">
      <KnotMark className="h-7 w-12 text-maroon" />
      <span className="font-serif text-2xl font-semibold tracking-tight">The Royal Knot</span>
    </Link>
  );
}
