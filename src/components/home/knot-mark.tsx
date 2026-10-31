// KnotOS mark: an infinity knot (two lives joined) with a diya flame rising from the crossing.
// Drawn as SVG so it stays crisp at any size and the knot can "draw itself" on the splash.
export function KnotMark({ className, animate, flameClassName = "text-marigold" }: { className?: string; animate?: boolean; flameClassName?: string }) {
  return (
    <svg viewBox="0 0 100 52" fill="none" className={className} aria-hidden>
      <path
        d="M50 34 C 40 22, 26 16, 15 21 C 5 26, 6 42, 17 45 C 29 48, 40 41, 50 34 C 60 27, 71 20, 83 23 C 94 26, 95 42, 85 45 C 74 49, 60 42, 50 34 Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
        pathLength={1}
        className={animate ? "knot-draw" : undefined}
      />
      <g className={`${flameClassName} ${animate ? "knot-dot" : ""}`}>
        <path d="M50 3 C 57 11, 59 19, 53.5 26 C 52.2 27.6, 50.8 29.6, 50 32 C 49.2 29.6, 47.8 27.6, 46.5 26 C 41 19, 43 11, 50 3 Z" fill="currentColor" />
        <path d="M50 13 C 53 17.5, 53.6 21.5, 50 26 C 46.4 21.5, 47 17.5, 50 13 Z" fill="oklch(0.97 0.03 85)" opacity="0.55" />
      </g>
    </svg>
  );
}
