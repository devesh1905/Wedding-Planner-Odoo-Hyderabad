"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sun } from "lucide-react";
import { cn } from "@/shared/utils";

const KEY = "knot:theme";

/** Shows where you can go: a diya on the light page (light the lamp → dark), a sun on the dark page. The new theme washes across the screen in a circle from the button. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function apply(next: boolean) {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next = !dark;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reduce) return apply(next);

    // Circle reveal from the button, sized to reach the farthest corner.
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = doc.startViewTransition(() => apply(next));
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Daylight — switch to light mode" : "Light the lamp — switch to night mode"}
      aria-pressed={dark}
      className={cn("relative grid size-9 place-items-center overflow-hidden rounded-full transition-colors hover:bg-foreground/5", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!dark ? (
          <motion.svg
            key="diya"
            viewBox="0 0 24 24"
            className="size-5"
            initial={{ y: 10, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          >
            <path d="M12 2.5c3.2 3.4 4 6.6 2.1 9.6-.6 1-1.4 1.7-2.1 2.9-.7-1.2-1.5-1.9-2.1-2.9C8 9.1 8.8 5.9 12 2.5Z" fill="#f0a03a" className="flame-l2" />
            <path d="M12 7.5c1.3 1.6 1.6 3.1.8 4.6-.3.5-.5.8-.8 1.4-.3-.6-.5-.9-.8-1.4-.8-1.5-.5-3 .8-4.6Z" fill="#fff2bf" className="flame-l4" />
            <path d="M5 16.5h14c-.6 2.6-3.3 4.5-7 4.5s-6.4-1.9-7-4.5Z" fill="currentColor" opacity="0.85" />
          </motion.svg>
        ) : (
          <motion.span
            key="sun"
            initial={{ y: 10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -8, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid place-items-center"
          >
            <Sun className="size-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
