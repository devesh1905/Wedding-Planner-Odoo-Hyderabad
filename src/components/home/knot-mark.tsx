// KnotOS mark: an infinity knot (two lives joined) with a gold thread rising from the crossing
// into a diya flame. Only the gold part animates: the thread lights up, then the flame catches.
//
// mode="draw"   – splash: the knot draws itself first, then the flame is lit
// mode="ignite" – the flame is lit on mount, then breathes gently
// (no mode)     – static, already lit
import { useId } from "react";

export function KnotMark({ className, mode, flameClassName = "text-marigold" }: { className?: string; mode?: "draw" | "ignite"; flameClassName?: string }) {
  // Blur in SVG units so the halo stays soft whether the mark is 20px or 500px wide.
  const glowId = `glow-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 100 52" fill="none" className={className} aria-hidden>
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>
      <path
        d="M50 34 C 40 22, 26 16, 15 21 C 5 26, 6 42, 17 45 C 29 48, 40 41, 50 34 C 60 27, 71 20, 83 23 C 94 26, 95 42, 85 45 C 74 49, 60 42, 50 34 Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
        pathLength={1}
        className={mode === "draw" ? "knot-draw" : undefined}
      />
      <g className={`${flameClassName} ${mode ? "flame-animate" : ""} ${mode === "draw" ? "flame-late" : ""}`}>
        <ellipse cx="50" cy="19" rx="8" ry="11" fill="currentColor" filter={`url(#${glowId})`} className="flame-halo" />
        {/* the thread: gold strand crossing over the knot and rising into the wick */}
        <path
          d="M59 42 C 55 39.5, 51.6 37, 50.4 33.5 C 49.9 32, 50 30.8, 50 29.6"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          pathLength={1}
          className="flame-thread"
        />
        <g className="flame-body">
          <path d="M50 3 C 57 11, 59 19, 53.5 26 C 52.2 27.6, 50.8 29, 50 31 C 49.2 29, 47.8 27.6, 46.5 26 C 41 19, 43 11, 50 3 Z" fill="currentColor" />
          <path d="M50 13 C 53 17.5, 53.6 21.5, 50 26.5 C 46.4 21.5, 47 17.5, 50 13 Z" fill="oklch(0.98 0.04 90)" opacity="0.6" className="flame-core" />
        </g>
      </g>
    </svg>
  );
}
