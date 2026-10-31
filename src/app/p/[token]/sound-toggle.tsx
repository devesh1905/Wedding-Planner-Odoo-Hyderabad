"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cue, setSoundEnabled, soundEnabled } from "@/lib/sound";

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
      className="rounded-full border bg-card p-2 text-muted-foreground hover:text-foreground"
      aria-label={on ? "Turn sounds off" : "Turn sounds on"}
      aria-pressed={on}
    >
      {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}
