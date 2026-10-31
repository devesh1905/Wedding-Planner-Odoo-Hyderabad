"use client";

/** A soft marigold petal fall — used for the couple's happy moments (enquiry sent, agreement signed). */
export async function petalShower(intensity: "soft" | "full" = "soft") {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  const petal = confetti.shapeFromPath({ path: "M10 0 C16 6 16 14 10 20 C4 14 4 6 10 0Z" });
  const origins = intensity === "full" ? [0.15, 0.5, 0.85] : [0.3, 0.7];
  for (const x of origins) {
    confetti({
      particleCount: intensity === "full" ? 45 : 25,
      spread: 70,
      startVelocity: 22,
      gravity: 0.55,
      scalar: 1.3,
      ticks: 280,
      origin: { x, y: -0.05 },
      angle: 270,
      shapes: [petal],
      colors: ["#e8a33d", "#f2b84b", "#d9822b", "#f6e7c8"],
    });
  }
}
