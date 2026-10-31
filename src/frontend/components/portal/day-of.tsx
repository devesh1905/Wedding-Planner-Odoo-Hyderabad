import { Icon } from "@/frontend/components/icons/icon";
import { cn } from "@/shared/utils";
import { AutoRefresh } from "./auto-refresh";

export type DayOfItem = { id: string; title: string; startsAt: Date; status: "UPCOMING" | "LIVE" | "DONE" | "DELAYED"; event: string };

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/**
 * The couple's view of the big day: what's happening now, what's next, and the day so far —
 * fed live from the planners' control room (run sheet statuses). Refreshes itself every 30 s.
 */
export function DayOf({ items, now }: { items: DayOfItem[]; now: Date }) {
  if (!items.length) return null;
  const current = items.find((i) => i.status === "LIVE") ?? null;
  const next = items.find((i) => i.status !== "DONE" && i !== current && i.startsAt >= (current?.startsAt ?? now)) ?? null;
  const done = items.filter((i) => i.status === "DONE").length;
  const late = items.some((i) => i.status === "DELAYED");

  return (
    <section className="squircle rounded-2xl border-2 border-marigold bg-card p-5 sm:p-6" aria-live="polite">
      <AutoRefresh everyMs={30_000} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Icon name="radar" className="size-6 shrink-0 text-eyebrow" />
          Live today
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-soft px-2.5 py-1 text-xs font-semibold text-rose">
          <span className="size-1.5 animate-pulse rounded-full bg-rose" /> LIVE
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {done} of {items.length} moments done{late ? " · one item is running a little late — your planner is on it" : ""}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Updated {time(now)} · refreshes every 30 seconds</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-cta p-4 text-cta-foreground">
          <p className="text-xs tracking-wider uppercase opacity-80">Happening now</p>
          <p className="mt-1 text-lg leading-snug font-semibold">{current ? current.title : "Getting ready"}</p>
          {current && (
            <p className="text-sm opacity-85">
              {current.event} · since {time(current.startsAt)}
            </p>
          )}
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">Up next</p>
          <p className="mt-1 text-lg leading-snug font-semibold">{next ? next.title : "That's a wrap!"}</p>
          {next && (
            <p className="text-sm text-muted-foreground">
              {next.event} · {time(next.startsAt)}
            </p>
          )}
        </div>
      </div>

      <details className="group mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground">
          Full timeline <Icon name="arrow" className="size-4 transition-transform group-open:rotate-90" />
        </summary>
        <ol className="mt-2 space-y-1 border-l pl-4">
          {items.map((i) => (
            <li key={i.id} className={cn("relative py-1 text-sm", i.status === "DONE" && "text-muted-foreground line-through decoration-muted-foreground/40")}>
              <span
                className={cn(
                  "absolute top-2.5 -left-[21px] size-2.5 rounded-full border-2 border-card",
                  i.status === "DONE" ? "bg-teal" : i.status === "LIVE" ? "bg-cta" : i.status === "DELAYED" ? "bg-rose" : "bg-muted-foreground/30",
                )}
              />
              <span className="tabular-nums">{time(i.startsAt)}</span> · {i.title}
              {i.status === "LIVE" && <span className="ml-1.5 text-xs font-semibold text-cta">now</span>}
              {i.status === "DELAYED" && <span className="ml-1.5 text-xs font-semibold text-rose">running late</span>}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
