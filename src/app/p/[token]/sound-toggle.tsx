"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cue, setSoundEnabled, soundEnabled } from "@/frontend/lib/sound";

export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!on);
        setOn(!on);
        if (!on) cue("toggle");
      }}
      className="grid size-11 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground sm:size-9 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={on ? "Turn sounds off" : "Turn sounds on"}
      aria-pressed={on}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
