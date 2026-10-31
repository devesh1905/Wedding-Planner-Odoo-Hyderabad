"use client";

import { useRef } from "react";
import Link from "next/link";
import { cue } from "@/lib/sound";
import { KnotMark } from "./knot-mark";
import { petalShower } from "./petals";

/** Logo link with a small reward for the curious: three quick clicks shower marigold petals. */
export function MonogramButton() {
  const clicks = useRef<number[]>([]);

  async function onClick(e: React.MouseEvent) {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 900), now];
    if (clicks.current.length < 3) return;
    e.preventDefault();
    clicks.current = [];
    cue("success", "subtle");
    await petalShower("full");
  }

  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-3" aria-label="The Royal Knot — home">
      <span className="relative">
        {/* In dark mode the diya softly lights the area around it. */}
        <span aria-hidden className="diya-ambient" />
        <KnotMark mode="ignite" className="relative h-7 w-14 text-maroon dark:text-[oklch(0.93_0.03_80)]" />
      </span>
      <span className="font-serif text-2xl font-semibold tracking-tight">The Royal Knot</span>
    </Link>
  );
}
