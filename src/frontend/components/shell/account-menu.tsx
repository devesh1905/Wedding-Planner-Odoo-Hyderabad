"use client";

// Account menu for the staff sidebar. Adapted from Kokonut UI's "Account Menu" (MIT,
// https://kokonutui.com): the panel morphs out of the trigger's own rectangle with a spring,
// keyboard navigation moves through rows, and Sign out needs a press-and-hold to confirm.
// Changes for KnotOS: opens upward from the bottom-left of the sidebar, single account,
// theme row drives the site theme, app colour tokens.

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { animate, motion, type Transition, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils";
import { initials } from "@/shared/format";

type Theme = "light" | "dark" | "system";
type Status = "online" | "away" | "busy";
type Item = { label: string; icon: ReactNode; href?: string; value?: string; onSelect?: () => void };

const PANEL_W = 304;
const RADIUS = 16;
const SPRING: Transition = { type: "spring", duration: 0.3, bounce: 0 };
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const THEME_KEY = "knot:theme";
const STATUS_KEY = "knot:status";

const STATUSES: { id: Status; label: string; name: string; dot: string }[] = [
  { id: "online", label: "On duty", name: "On duty", dot: "bg-teal" },
  { id: "away", label: "Away", name: "Away", dot: "bg-marigold" },
  { id: "busy", label: "At venue", name: "At a venue — do not disturb", dot: "bg-rose" },
];
const THEMES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;

const ITEM =
  "flex w-full cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm text-foreground/80 outline-none transition-colors duration-100 focus:bg-muted focus:text-foreground";

/** Applies the theme the same way the rest of the site does (class on <html> + remembered choice). */
function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (t === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {}
}

function Avatar({ name, status, className }: { name: string; status?: Status; className?: string }) {
  const dot = STATUSES.find((s) => s.id === status)?.dot;
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full bg-cta text-[11px] font-semibold tracking-wide text-cta-foreground select-none",
        className,
      )}
    >
      {initials(name)}
      {dot && <span className={cn("absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background transition-colors duration-200", dot)} />}
    </span>
  );
}

function HoldSignOut({ duration, onComplete }: { duration: number; onComplete: () => void }) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const [nudge, setNudge] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const nudgeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => (window.clearTimeout(timer.current), window.clearTimeout(nudgeTimer.current)), []);

  const start = () => {
    if (timer.current !== undefined || done) return;
    window.clearTimeout(nudgeTimer.current);
    setNudge(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      setDone(true);
      onComplete();
    }, duration);
  };
  const cancel = () => {
    if (timer.current === undefined) return;
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
    setNudge(true);
    nudgeTimer.current = window.setTimeout(() => setNudge(false), 1400);
  };
  const label = (
    <>
      <LogOut className="size-4" />
      <span className="flex-1">Sign out</span>
      <span className="text-xs opacity-60">{nudge ? "Keep holding" : "Hold"}</span>
    </>
  );
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-menu-item=""
      className={cn(ITEM, "relative touch-none select-none")}
      onBlur={cancel}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cancel();
        }
      }}
      onPointerCancel={cancel}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={cancel}
    >
      {label}
      <span className="sr-only">, press and hold to confirm</span>
      {/* the fill: an inverted copy of the row, revealed left to right while held */}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center gap-2.5 rounded-[10px] bg-cta px-2.5 text-cta-foreground"
        style={{
          clipPath: holding || done ? "inset(0 0 0 0 round 10px)" : "inset(0 100% 0 0 round 10px)",
          transition: holding ? `clip-path ${duration}ms linear` : "clip-path 240ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function AccountMenu({
  user,
  compact,
  items,
  onSignOut,
  holdDuration = 1000,
}: {
  user: { name: string; role: string };
  /** Sidebar rail: the trigger is just the avatar. */
  compact?: boolean;
  items: Item[];
  onSignOut: () => void;
  holdDuration?: number;
}) {
  const uid = useId();
  const reduced = useReducedMotion() === true;
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const [openSeq, setOpenSeq] = useState(0);
  const [theme, setThemeState] = useState<Theme>("system");
  const [status, setStatusState] = useState<Status>("online");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const instant = useRef(false);
  const closeSeq = useRef(0);

  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      setThemeState(t === "light" || t === "dark" ? t : "system");
      const s = localStorage.getItem(STATUS_KEY);
      if (s === "online" || s === "away" || s === "busy") setStatusState(s);
    } catch {}
  }, []);
  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };
  const setStatus = (s: Status) => {
    setStatusState(s);
    try {
      localStorage.setItem(STATUS_KEY, s);
    } catch {}
  };

  // The panel grows from the trigger's rectangle (bottom-left) up and to the right.
  const w = useMotionValue(0);
  const h = useMotionValue(0);
  const body = useMotionValue(1);
  const outerClip = useMotionTemplate`inset(calc(100% - ${h}px) calc(100% - ${w}px) 0px 0px round ${RADIUS}px)`;
  const innerClip = useMotionTemplate`inset(calc(100% - ${h}px + 1px) calc(100% - ${w}px + 1px) 1px 1px round ${RADIUS - 1}px)`;

  const open = (keyboard: boolean) => {
    if (phaseRef.current === "open") return;
    closeSeq.current += 1;
    instant.current = keyboard || reduced;
    setPhase("open");
    setOpenSeq((n) => n + 1);
  };
  const close = (keyboard: boolean, returnFocus: boolean) => {
    if (phaseRef.current !== "open") return;
    const trigger = triggerRef.current;
    if (returnFocus) trigger?.focus({ preventScroll: true });
    if (keyboard || reduced || !trigger) return setPhase("closed");
    setPhase("closing");
    const seq = ++closeSeq.current;
    animate(body, 0, { duration: 0.12, ease: EASE_OUT });
    animate(w, trigger.offsetWidth, SPRING);
    animate(h, trigger.offsetHeight, SPRING).then(() => closeSeq.current === seq && setPhase("closed"));
  };

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!openSeq || phaseRef.current !== "open" || !trigger || !panel) return;
    const target = panel.offsetHeight;
    if (instant.current) {
      w.jump(PANEL_W);
      h.jump(target);
      body.jump(1);
    } else {
      w.jump(trigger.offsetWidth);
      h.jump(trigger.offsetHeight);
      body.jump(0);
      animate(w, PANEL_W, SPRING);
      animate(h, target, SPRING);
      animate(body, 1, { duration: 0.2, delay: 0.05, ease: EASE_OUT });
    }
    panel.querySelector<HTMLElement>("[data-menu-item]")?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSeq]);

  // A press anywhere outside closes, with the morph.
  useEffect(() => {
    if (phase !== "open") return;
    const onDown = (e: PointerEvent) => !wrapperRef.current?.contains(e.target as Node) && close(false, false);
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      return close(true, true);
    }
    const list = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? list[(i + 1) % list.length]
        : e.key === "ArrowUp"
          ? list[(i - 1 + list.length) % list.length]
          : e.key === "Home"
            ? list[0]
            : e.key === "End"
              ? list.at(-1)
              : undefined;
    if (next) {
      e.preventDefault();
      next.focus({ preventScroll: true });
    }
  };

  const role = user.role.toLowerCase();
  const isOpen = phase === "open";

  return (
    <div ref={wrapperRef} className={cn("relative isolate", compact ? "inline-block" : "block w-full", phase !== "closed" && "z-50")}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${uid}-menu` : undefined}
        aria-label={compact ? `${user.name} — account menu` : undefined}
        onClick={(e) => open(e.detail === 0)}
        onKeyDown={(e) => (e.key === "ArrowUp" || e.key === "ArrowDown") && (e.preventDefault(), open(true))}
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "p-0.5" : "w-full p-1.5",
          phase !== "closed" && "invisible",
        )}
      >
        <Avatar name={user.name} status={status} className="size-8" />
        {!compact && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground capitalize">{role}</span>
          </span>
        )}
      </button>

      {phase !== "closed" && (
        <div className="pointer-events-none absolute bottom-0 left-0 z-10" style={{ width: PANEL_W }}>
          <div aria-hidden className="absolute inset-0 [filter:drop-shadow(0_12px_24px_rgb(0_0_0/0.12))_drop-shadow(0_2px_4px_rgb(0_0_0/0.06))]">
            <motion.div className="absolute inset-0 bg-border" style={{ clipPath: outerClip }} />
            <motion.div className="absolute inset-0 bg-popover" style={{ clipPath: innerClip }} />
          </div>
          <motion.div className={cn("relative", isOpen && "pointer-events-auto")} style={{ clipPath: innerClip }} onKeyDown={onKey}>
            <div
              ref={panelRef}
              className="p-1.5 text-popover-foreground"
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse") return;
                const item = (e.target as HTMLElement).closest<HTMLElement>("[data-menu-item]");
                if (item && document.activeElement !== item) item.focus({ preventScroll: true });
              }}
            >
              <motion.div style={{ opacity: body }} className="flex items-start gap-3 px-2.5 pt-2.5 pb-3">
                <Avatar name={user.name} status={status} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground capitalize">{role} · The Royal Knot</span>
                </span>
              </motion.div>
              <motion.div id={`${uid}-menu`} role="menu" aria-label={user.name} tabIndex={-1} className="outline-none" style={{ opacity: body }}>
                <fieldset aria-label="Status" className="m-0 flex min-w-0 items-center justify-between border-0 py-1 pr-1 pl-2.5">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="flex">
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={s.id === status}
                        aria-label={s.name}
                        tabIndex={-1}
                        data-menu-item=""
                        onClick={() => setStatus(s.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap text-muted-foreground outline-none transition-colors focus:bg-muted aria-checked:text-foreground"
                      >
                        <span className={cn("size-2 rounded-full transition-colors", s.id === status ? s.dot : "bg-muted-foreground/30")} />
                        {s.label}
                      </button>
                    ))}
                  </span>
                </fieldset>
                <fieldset aria-label="Theme" className="m-0 flex min-w-0 items-center justify-between border-0 py-1 pr-1 pl-2.5">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <span className="flex rounded-[10px] bg-muted p-0.5">
                    {THEMES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={id === theme}
                        aria-label={label}
                        tabIndex={-1}
                        data-menu-item=""
                        onClick={() => setTheme(id)}
                        className="relative grid h-7 w-9 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-checked:text-foreground"
                      >
                        {id === theme && (
                          <motion.span
                            layoutId={`${uid}-theme`}
                            transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.25, bounce: 0 }}
                            className="absolute inset-0 rounded-lg bg-background shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                          />
                        )}
                        <Icon className="relative size-3.5" />
                      </button>
                    ))}
                  </span>
                </fieldset>
                <hr className="mx-2.5 my-1.5 h-px border-0 bg-border" />
                {items.map((it) => {
                  const inner = (
                    <>
                      <span className="text-muted-foreground">{it.icon}</span>
                      <span className="flex-1">{it.label}</span>
                      {it.value && <span className="text-xs text-muted-foreground">{it.value}</span>}
                    </>
                  );
                  const select = (e: React.MouseEvent) => {
                    it.onSelect?.();
                    close(e.detail === 0, true);
                  };
                  return it.href ? (
                    <Link key={it.label} href={it.href} role="menuitem" tabIndex={-1} data-menu-item="" className={ITEM} onClick={select}>
                      {inner}
                    </Link>
                  ) : (
                    <button key={it.label} type="button" role="menuitem" tabIndex={-1} data-menu-item="" className={ITEM} onClick={select}>
                      {inner}
                    </button>
                  );
                })}
                <hr className="mx-2.5 my-1.5 h-px border-0 bg-border" />
                <HoldSignOut
                  duration={holdDuration}
                  onComplete={() => {
                    onSignOut();
                    close(false, false);
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
