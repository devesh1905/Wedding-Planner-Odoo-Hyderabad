"use client";

import type { Emphasis, SoundName } from "cuelume";

// Interaction sounds, used only on couple-facing screens (enquiry form, signing, couple portal).
// Loaded lazily, quiet by default, and skipped if the couple turned sound off.

const KEY = "knot:sound";
let lib: Promise<typeof import("cuelume")> | null = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

export function cue(name: SoundName, emphasis: Emphasis = "subtle") {
  if (typeof window === "undefined" || !soundEnabled()) return;
  lib ??= import("cuelume").then((m) => {
    m.setVolume(0.5);
    return m;
  });
  lib.then((m) => m.play(name, { emphasis })).catch(() => {});
}
