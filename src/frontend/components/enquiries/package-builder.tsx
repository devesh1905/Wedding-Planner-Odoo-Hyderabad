"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { Icon } from "@/frontend/components/icons/icon";
import { cn } from "@/shared/utils";
import { ScrollPanel } from "@/frontend/components/common/scroll-panel";
import { cue } from "@/frontend/lib/sound";
import { formatINRCompact } from "@/shared/format";
import {
  DEFAULT_GUESTS,
  estimate,
  EVENTS,
  EVENT_LABELS,
  PLANNING,
  RANGE_NOTE,
  SERVICE_GROUPS,
  SERVICES,
  type EventKey,
  type PackageEstimate,
  type PlanningKey,
  type ServiceKey,
} from "@/shared/package-builder";

export type PackageSelection = { planning: PlanningKey; events: EventKey[]; services: ServiceKey[] };

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** Eases a rupee figure to its new value; jumps straight there when the user prefers reduced motion. */
export function AnimatedAmount({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      from.current = value;
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.4,
      ease: "easeOut",
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{formatINRCompact(Math.round(shown / 10_000) * 10_000)}</>;
}

/** "for 400 guests (example) — add your guest count above" until a real number is typed. */
export function guestNote(est: Pick<PackageEstimate, "guests" | "assumedGuests">) {
  return est.assumedGuests ? `for ${DEFAULT_GUESTS} guests (example) — add your guest count above` : `for ${est.guests} guests`;
}

export const INCLUDED_NOTE =
  "Includes vendor costs for the services you've ticked and our planning fee. Excludes GST (18%), venue rental, guest flights and gold/jewellery.";

/** "View breakdown" disclosure: one row per service, subtotal, planning fee, total and how the range is made. */
export function EstimateBreakdown({ est, className, contained = true }: { est: PackageEstimate; className?: string; contained?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const services = est.lines.filter((l) => l.key !== "fee");
  const fee = est.lines.find((l) => l.key === "fee");
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-maroon outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {open ? "Hide breakdown" : "View breakdown"}
        <Icon name="arrow" className={cn("size-3.5 transition-transform motion-reduce:transition-none", open ? "-rotate-90" : "rotate-90")} />
      </button>
      {/* in the phone bar the list scrolls on its own; in the desktop card the whole card scrolls */}
      <div id={id} hidden={!open}>
        <ScrollPanel className={contained ? "max-h-[45svh]" : undefined} innerClassName="pr-3">
        <dl className="divide-y divide-border text-sm">
          {services.map((l) => (
            <div key={l.key} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="min-w-0 text-muted-foreground">{l.label}</dt>
              <dd className="shrink-0 tabular">{formatINRCompact(l.amount)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 py-1.5 font-medium">
            <dt>Services subtotal</dt>
            <dd className="shrink-0 tabular">{formatINRCompact(est.subtotal)}</dd>
          </div>
          {fee && (
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="min-w-0 text-muted-foreground">{fee.label}</dt>
              <dd className="shrink-0 tabular">{formatINRCompact(fee.amount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 py-1.5 font-semibold">
            <dt>Total</dt>
            <dd className="shrink-0 tabular">{formatINRCompact(est.total)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-xs text-pretty text-muted-foreground">{RANGE_NOTE}</p>
        </ScrollPanel>
      </div>
    </div>
  );
}

/** The live range + guest note, or a nudge when nothing is ticked. Shared by the phone bar and the desktop summary. */
export function EstimateFigure({ est, none }: { est: PackageEstimate; none: boolean }) {
  if (none) return <p className="mt-0.5 text-sm text-muted-foreground">Tick a service to see an estimate.</p>;
  return (
    <p className="mt-0.5 text-lg font-semibold tabular">
      <AnimatedAmount value={est.low} /> – <AnimatedAmount value={est.high} />
      <span className="block text-xs font-normal text-pretty text-muted-foreground">{guestNote(est)}</span>
    </p>
  );
}

export function PackageBuilder({
  value,
  onChange,
  guests,
  sound,
}: {
  value: PackageSelection;
  onChange: (v: PackageSelection) => void;
  /** guests typed in the form above (may be empty) */
  guests: number | null;
  sound?: boolean;
}) {
  const tick = () => sound && cue("select");
  const est = estimate({ guests, services: value.services, events: value.events, planning: value.planning });
  const none = value.services.length === 0;

  return (
    <section id="step-package" aria-labelledby="package-title" className="scroll-mt-20 space-y-6 border-t pt-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.2em] text-eyebrow uppercase">Step 2 · Your package</p>
        <h2 id="package-title" className="mt-1 text-2xl font-semibold sm:text-3xl">
          Build your package
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Tick what you&apos;d like us to handle — you&apos;ll see an estimate as you go.
        </p>
      </header>

      <div role="radiogroup" aria-label="Planning level" className="grid gap-3 sm:grid-cols-2">
        {PLANNING.map((p) => {
          const on = value.planning === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                tick();
                onChange({ ...value, planning: p.key });
              }}
              className={cn(
                "min-h-20 rounded-xl border p-4 text-left transition-[background-color,border-color,transform] duration-200 outline-none active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:active:scale-100",
                on ? "border-cta bg-cta/10" : "bg-card hover:border-maroon/40",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", on ? "border-cta bg-cta" : "border-input")}>
                  {on && <span className="size-1.5 rounded-full bg-cta-foreground" />}
                </span>
                {p.label}
              </span>
              <span className="mt-1 block text-sm text-pretty text-muted-foreground">{p.description}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p id="events-label" className="text-sm font-medium">
          Which events?
        </p>
        <div role="group" aria-labelledby="events-label" className="flex flex-wrap gap-2">
          {EVENTS.map((ev) => {
            const on = value.events.includes(ev);
            return (
              <button
                key={ev}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => {
                  tick();
                  onChange({ ...value, events: toggle(value.events, ev) });
                }}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-[color,background-color,border-color,transform] duration-200 outline-none active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9",
                  on ? "border-cta bg-cta text-cta-foreground" : "bg-card hover:border-maroon/40 hover:bg-maroon-soft",
                )}
              >
                {EVENT_LABELS[ev]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">What should we handle?</p>
        {SERVICE_GROUPS.map((g) => (
          <div key={g.key} className="space-y-2">
            <h3 id={`services-${g.key}`} className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              {g.label}
            </h3>
            <div role="group" aria-labelledby={`services-${g.key}`} className="grid gap-2.5 sm:grid-cols-2">
              {SERVICES.filter((s) => s.group === g.key).map((s) => {
                const on = value.services.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => {
                      tick();
                      onChange({ ...value, services: toggle(value.services, s.key) });
                    }}
                    className={cn(
                      "flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition-[background-color,border-color,transform] duration-200 outline-none active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:active:scale-100",
                      on ? "border-cta bg-cta/10" : "bg-card hover:border-maroon/40",
                    )}
                  >
                    <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg", on ? "bg-cta text-cta-foreground" : "bg-muted text-muted-foreground")}>
                      <Icon name={s.icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className="block text-xs text-pretty text-muted-foreground">{s.description}</span>
                    </span>
                    <span aria-hidden className={cn("mt-1 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-cta bg-cta text-cta-foreground" : "border-input")}>
                      {on && <Icon name="check" className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Phones and tablets: sticks to the bottom of the screen while the builder is in view.
          At lg+ the sticky summary card beside the form shows the same figures instead. */}
      <div className="squircle sticky bottom-3 z-10 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
        <div role="status" aria-live="polite">
          <p className="text-xs font-semibold tracking-[0.15em] text-eyebrow uppercase">Indicative estimate</p>
          <EstimateFigure est={est} none={none} />
        </div>
        {!none && <EstimateBreakdown est={est} />}
        <p className="mt-0.5 text-xs text-pretty text-muted-foreground">An estimate, not a quote — your planner confirms after the first call.</p>
      </div>
      {!none && <p className="text-xs text-pretty text-muted-foreground lg:hidden">{INCLUDED_NOTE}</p>}
    </section>
  );
}
