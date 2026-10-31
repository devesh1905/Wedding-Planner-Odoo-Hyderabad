"use client";

import { Icon } from "@/components/icons/icon";
import { cn } from "@/lib/utils";

/** Opens the global search palette (the app shell listens for this event). */
export function SearchButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("knot:search"))}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <Icon name="search" className="size-4" />
      Search
      <kbd className="hidden rounded border bg-muted px-1.5 font-sans text-[10px] sm:inline">Ctrl K</kbd>
    </button>
  );
}
