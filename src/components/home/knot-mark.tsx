// The Royal Knot monogram: two interlocking rings drawn as one stroke path, so it can "draw itself".
export function KnotMark({ className, animate }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" className={className} aria-hidden>
      <path
        d="M26 20a12 12 0 1 1-24 0 12 12 0 0 1 24 0Zm0 0a12 12 0 1 0 24 0 12 12 0 0 0-24 0Z"
        transform="translate(6 0)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        pathLength={1}
        className={animate ? "knot-draw" : undefined}
      />
      <circle cx="32" cy="8" r="1.6" fill="currentColor" className={animate ? "knot-dot" : undefined} />
    </svg>
  );
}
