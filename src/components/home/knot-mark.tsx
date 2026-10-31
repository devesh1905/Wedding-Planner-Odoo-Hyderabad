// KnotOS mark: an infinity knot (two lives joined) with a diya flame rising out of the crossing.
// The flame's base sits *inside* the crossing, under the knot strands, so it emerges seamlessly.
// Four flame layers sway at different speeds; with `effects`, the flame also warms the nearby
// strands (light) and the knot casts a soft shadow away from it — both flicker with the flame.
//
// mode="draw"   – splash: the knot draws itself first, then the flame catches
// mode="ignite" – the flame catches on mount
// (no mode)     – already lit
import { useId } from "react";
import { ShaderFlame } from "@/components/cave/shader-flame";

const KNOT =
  "M50 34 C 40 22, 26 16, 15 21 C 5 26, 6 42, 17 45 C 29 48, 40 41, 50 34 C 60 27, 71 20, 83 23 C 94 26, 95 42, 85 45 C 74 49, 60 42, 50 34 Z";

// Base of every layer sits at the crossing (y≈34), hidden by the knot stroke.
const OUTER = "M50 4 C 58.5 13, 60.5 22, 55.2 29 C 53.4 31.4, 51.6 32.8, 50 34.6 C 48.4 32.8, 46.6 31.4, 44.8 29 C 39.5 22, 41.5 13, 50 4 Z";
const MID = "M50 9.5 C 56.4 16.5, 57.4 23.4, 53.6 28.6 C 52.3 30.4, 51.1 31.8, 50 34 C 48.9 31.8, 47.7 30.4, 46.4 28.6 C 42.6 23.4, 43.6 16.5, 50 9.5 Z";
const INNER = "M50 16.5 C 53.6 20.8, 54.2 25, 52 28.8 C 51.2 30.2, 50.5 31.4, 50 33.2 C 49.5 31.4, 48.8 30.2, 48 28.8 C 45.8 25, 46.4 20.8, 50 16.5 Z";
const CORE = "M50 22.5 C 51.8 24.8, 52 27.2, 50.9 29.5 C 50.6 30.2, 50.3 30.9, 50 31.8 C 49.7 30.9, 49.4 30.2, 49.1 29.5 C 48 27.2, 48.2 24.8, 50 22.5 Z";

export function KnotMark({
  className,
  mode,
  flameClassName = "",
  effects = true,
}: {
  className?: string;
  mode?: "draw" | "ignite";
  flameClassName?: string;
  effects?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const u = (name: string) => `url(#${name}-${id})`;
  const draw = mode === "draw" ? "knot-draw" : undefined;
  const flameState = `${mode ? "flame-animate" : ""} ${mode === "draw" ? "flame-late" : ""}`;

  return (
    <svg viewBox="0 0 100 52" fill="none" className={className} aria-hidden>
      <defs>
        <filter id={`glow-${id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`soft-${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <filter id={`bloom-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        {/* warm light falling on the knot, strongest right under the flame */}
        <radialGradient id={`light-${id}`} cx="50" cy="27" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="0.28" stopColor="#f4a93c" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#e8a33d" stopOpacity="0.12" />
          <stop offset="1" stopColor="#e8a33d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`outer-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0a03a" />
          <stop offset="1" stopColor="#c2501d" />
        </linearGradient>
        <linearGradient id={`mid-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc457" />
          <stop offset="1" stopColor="#ea8a2c" />
        </linearGradient>
        <linearGradient id={`inner-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2bf" />
          <stop offset="1" stopColor="#ffc65e" />
        </linearGradient>
      </defs>

      {/* shadow cast by the knot, falling away (down) from the flame */}
      {effects && (
        <g className={`flame-shadow ${flameState}`}>
          <path d={KNOT} stroke="#2a0a10" strokeWidth="3.4" strokeLinejoin="round" opacity="0.28" transform="translate(0 2.6)" filter={u("soft")} pathLength={1} className={draw} />
        </g>
      )}

      <g className={`${flameClassName} ${flameState}`}>
        <ellipse cx="50" cy="21" rx="11" ry="14" fill="#f4a93c" filter={u("glow")} className="flame-halo" />
        <g className="flame-body">
          <path d={OUTER} fill={u("outer")} opacity="0.92" className="flame-l1" />
          <path d={MID} fill={u("mid")} className="flame-l2" />
          <path d={INNER} fill={u("inner")} className="flame-l3" />
          <path d={CORE} fill="#fffaf0" filter={u("bloom")} className="flame-l4" />
          {/* live fire: drawn in-place so the knot strand still covers its base; hides the vector layers when running */}
          {effects && (
            <foreignObject x="34" y="0" width="32" height="36" className="knot-flame-gl">
              <ShaderFlame className="block h-full w-full" fallback={null} />
            </foreignObject>
          )}
        </g>
      </g>

      {/* the knot sits on top of the flame's base, hiding where it springs from */}
      <path d={KNOT} stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" pathLength={1} className={draw} />

      {/* firelight on the strands near the flame */}
      {effects && (
        <g className={`flame-light ${flameState}`}>
          <path d={KNOT} stroke={u("light")} strokeWidth="3.4" strokeLinejoin="round" style={{ mixBlendMode: "screen" }} />
        </g>
      )}
    </svg>
  );
}
