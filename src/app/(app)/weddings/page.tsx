import Link from "next/link";
import { CalendarHeart, MapPin, Users } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/common/page-header";
import { StagePill, statusLabel } from "@/components/common/stage-pill";
import { OwnerAvatar } from "@/components/common/owner-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatINRCompact, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Weddings" };

const JOURNEY = ["BOOKED", "PLANNING", "VENDORS", "BIG_DAY", "SETTLEMENT", "SETTLED"] as const;

export default async function WeddingsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const weddings = await db.wedding.findMany({
    where: { stage: { not: "CANCELLED" } },
    orderBy: { startDate: "asc" },
    include: {
      package: { select: { name: true, kind: true } },
      leadPlanner: { select: { name: true, avatarColor: true } },
      tasks: { select: { stage: true } },
      milestones: { where: { status: "DUE" }, orderBy: { dueDate: "asc" }, take: 1, select: { label: true, amount: true, dueDate: true } },
    },
  });

  const counts = Object.fromEntries(JOURNEY.map((s) => [s, weddings.filter((w) => w.stage === s).length]));
  const shown = stage && (JOURNEY as readonly string[]).includes(stage) ? weddings.filter((w) => w.stage === stage) : weddings;

  return (
    <>
      <PageHeader title="Weddings" subtitle={`${weddings.length} weddings this season · from booking to settlement`} />

      {/* Journey tracker: where every wedding is right now. Equal segments, so the bar reads as one
          pipeline; the thin meter under each stage shows its share of the season. */}
      <nav aria-label="Filter by stage" className="mb-6 overflow-x-auto">
        <ol className="grid min-w-[44rem] grid-cols-7 gap-1 rounded-2xl border bg-card p-1.5">
          {(["ALL", ...JOURNEY] as const).map((s, i) => {
            const active = s === "ALL" ? !stage : stage === s;
            const n = s === "ALL" ? weddings.length : counts[s];
            return (
              <li key={s}>
                <Link
                  href={s === "ALL" ? "/weddings" : `/weddings?stage=${s}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-full flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "bg-cta text-cta-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className={cn("flex items-center gap-1.5 text-xs font-medium", active ? "opacity-90" : "text-muted-foreground")}>
                    {s !== "ALL" && (
                      <span
                        className={cn(
                          "grid size-4 place-items-center rounded-full text-[10px] font-semibold",
                          active ? "bg-cta-foreground/20" : "bg-muted text-foreground/70 group-hover:bg-background",
                        )}
                      >
                        {i}
                      </span>
                    )}
                    <span className="truncate">{s === "ALL" ? "All weddings" : statusLabel(s)}</span>
                  </span>
                  <span className="text-2xl leading-none font-semibold tabular-nums">{n}</span>
                  <span className={cn("h-1 overflow-hidden rounded-full", active ? "bg-cta-foreground/20" : "bg-muted")} aria-hidden>
                    <span
                      className={cn("block h-full rounded-full", active ? "bg-cta-foreground" : "bg-marigold")}
                      style={{ width: `${weddings.length ? Math.round((n / weddings.length) * 100) : 0}%` }}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {shown.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="No weddings here" hint="Weddings appear once a signed enquiry is converted." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((w) => {
            const done = w.tasks.filter((t) => t.stage === "DONE").length;
            const pct = w.tasks.length ? Math.round((done / w.tasks.length) * 100) : 0;
            const next = w.milestones[0];
            const overdue = next && next.dueDate < new Date();
            return (
              <Link
                key={w.id}
                href={`/weddings/${w.id}`}
                className="group flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-maroon/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <StagePill status={w.stage} />
                  <span className="text-xs text-muted-foreground tabular">{w.code}</span>
                </div>
                <h2 className="mt-3 text-2xl leading-tight font-semibold break-words group-hover:text-maroon">
                  {w.partner1} & {w.partner2}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(w.startDate)} · {relativeDays(w.startDate)}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {w.venue ? `${w.venue}, ` : ""}
                    {w.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {w.guestCount}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{w.tasks.length ? `${done}/${w.tasks.length} tasks` : "Plan not generated"}</span>
                    <span className="font-medium tabular">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="rounded-md bg-muted px-2 py-0.5">{w.package.kind === "FULL_SERVICE" ? "Full-Service" : "Day-of"}</span>
                  {next ? (
                    <span className={cn("tabular", overdue ? "font-medium text-rose" : "text-muted-foreground")}>
                      {formatINRCompact(next.amount)} {overdue ? "overdue" : `due ${formatDate(next.dueDate)}`}
                    </span>
                  ) : (
                    <span className="text-teal">All client payments in</span>
                  )}
                  <OwnerAvatar name={w.leadPlanner?.name} color={w.leadPlanner?.avatarColor} size="xs" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
