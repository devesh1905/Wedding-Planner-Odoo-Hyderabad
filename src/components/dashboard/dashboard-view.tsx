import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/icon";
import type { SeasonReport } from "@/lib/reports";
import { Amount } from "@/components/common/amount";
import { StagePill, statusLabel } from "@/components/common/stage-pill";
import { formatDate, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const JOURNEY = ["BOOKED", "PLANNING", "VENDORS", "BIG_DAY", "SETTLEMENT", "SETTLED"] as const;
const STAGE_TONE: Record<string, string> = {
  BOOKED: "bg-muted-foreground/40",
  PLANNING: "bg-marigold/60",
  VENDORS: "bg-marigold",
  BIG_DAY: "bg-cta",
  SETTLEMENT: "bg-teal/60",
  SETTLED: "bg-teal",
};

/**
 * Founder dashboard, laid out as a bento grid: the one number that matters (profit) gets the big
 * card, then where the money goes, then what needs a decision. Everything is server-rendered
 * HTML/SVG — no client charts — so the page paints complete in one go.
 * Shared by the dashboard and the read-only share page (links disabled there).
 */
export function DashboardView({ report: r, readOnly }: { report: SeasonReport; readOnly?: boolean }) {
  const season = r.period === "season";
  const when = periodLabel(r.period);
  const span = r.window ? ` · ${formatDate(r.window.fromDay)}${r.period === "today" ? "" : ` – ${formatDate(new Date(+r.window.toDay - 86_400_000))}`}` : "";
  const W = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) =>
    readOnly ? <span className={className}>{children}</span> : <Link href={`/weddings/${id}`} className={cn("hover:text-cta hover:underline", className)}>{children}</Link>;

  const costed = r.rows.filter((w) => w.costed);
  const revenue = costed.reduce((s, w) => s + w.revenue, 0);
  const vendor = costed.reduce((s, w) => s + w.vendorCost, 0);
  const team = costed.reduce((s, w) => s + w.teamCost, 0);
  const profit = r.kpi.seasonProfit;
  const byProfit = [...costed].sort((a, b) => b.profit - a.profit);
  const ranked = [...r.scorecards].filter((v) => v.punctuality != null).sort((a, b) => (b.punctuality ?? 0) - (a.punctuality ?? 0) || a.avgLateMin - b.avgLateMin);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {season ? "Every wedding this season" : `Weddings with an event ${when}${span}`}
      </p>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* ── Profit: the headline number ─────────────────────────────── */}
        <Card className="lg:col-span-5" title={season ? "Season profit" : `Profit · ${when}`} icon="chart">
          <p className={cn("mt-1 text-5xl font-semibold tracking-tight tabular", profit < 0 ? "text-rose" : "text-foreground")}>{formatINRCompact(profit)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Chip tone={r.kpi.avgMargin < 0 ? "rose" : "teal"}>{pct(r.kpi.avgMargin)} avg margin</Chip>
            {r.kpi.lossMaking > 0 && <Chip tone="rose">{r.kpi.lossMaking} loss-making</Chip>}
            <span className="text-muted-foreground">across {r.kpi.costedWeddings} costed weddings</span>
          </p>
          <ProfitStrip rows={costed} />
          <dl className="mt-4 divide-y border-t text-sm">
            <Line dot="bg-foreground/70" label="Revenue (contract + add-ons)" value={revenue} />
            <Line dot="bg-marigold" label="Vendor cost (agreed + extras)" value={-vendor} />
            <Line dot="bg-muted-foreground/50" label="Team hours × hourly cost" value={-team} />
          </dl>
        </Card>

        {/* ── Where each rupee goes ───────────────────────────────────── */}
        <Card className="lg:col-span-4" title="Where each rupee goes" icon="wallet">
          <RupeeRing revenue={revenue} vendor={vendor} team={team} profit={profit} />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <Stat label={`Collected ${when}`} value={formatINRCompact(r.kpi.collectedInPeriod)} tone="text-teal" />
            <Stat label={`Paid to vendors ${when}`} value={formatINRCompact(r.kpi.paidOutInPeriod)} />
          </div>
        </Card>

        {/* ── Pipeline + attention ────────────────────────────────────── */}
        <div className="grid gap-4 lg:col-span-3">
          <Card title={season ? "Weddings" : `Weddings ${when}`} icon="heart">
            <p className="mt-1 text-4xl font-semibold tabular">{r.rows.length}</p>
            <p className="text-sm text-muted-foreground">
              {r.kpi.activeWeddings} active{season ? "" : ` · ${r.seasonCount} this season`}
            </p>
            <StageBar rows={r.rows} />
          </Card>
          <Card title="Needs a decision" icon="warning" tone={r.overduePayments.length || r.kpi.openIssues ? "rose" : undefined}>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Stat label="Payments overdue" value={String(r.overduePayments.length)} tone={r.overduePayments.length ? "text-rose" : "text-teal"} big />
              <Stat label="Open issues" value={String(r.kpi.openIssues)} tone={r.kpi.openIssues ? "text-rose" : "text-teal"} big />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatINRCompact(r.kpi.dueInPeriod)} due {season ? "in the next 4 weeks" : when}
              {!season && ` · ${r.kpi.issuesInPeriod} issues raised ${when}`}
            </p>
          </Card>
        </div>

        {/* ── Profit by wedding: diverging bars ───────────────────────── */}
        <Card className="lg:col-span-8" title="Profit by wedding" icon="chart" note="Revenue − vendor costs − team hours. Best first; losses in rose.">
          {byProfit.length === 0 ? (
            <Empty>No weddings with booked vendors {when}.</Empty>
          ) : (
            <ProfitBars rows={byProfit} W={W} />
          )}
        </Card>

        {/* ── Cash flow ahead ─────────────────────────────────────────── */}
        <Card className="lg:col-span-4" title="Cash flow ahead" icon="money" note="Client payments due in vs vendor balances due out">
          <div className="mt-2 space-y-5">
            {r.horizon.map((h) => {
              const max = Math.max(...r.horizon.map((x) => Math.max(x.moneyIn, x.moneyOut)), 1);
              const net = h.moneyIn - h.moneyOut;
              return (
                <div key={h.days}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium">Next {h.days === 7 ? "week" : `${h.days / 7} weeks`}</span>
                    <span className={cn("text-xs font-semibold tabular", net < 0 ? "text-rose" : "text-teal")}>net {formatINRCompact(net)}</span>
                  </div>
                  <Meter label="In" value={h.moneyIn} max={max} className="bg-teal" />
                  <Meter label="Out" value={h.moneyOut} max={max} className="bg-rose" />
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Overdue payments ────────────────────────────────────────── */}
        <Card className="lg:col-span-6" title="Overdue client payments" icon="card" tone={r.overduePayments.length ? "rose" : undefined}>
          {r.overduePayments.length === 0 ? (
            <Empty>Nothing overdue.</Empty>
          ) : (
            <ul className="mt-1 divide-y text-sm">
              {r.overduePayments.slice(0, 6).map((m) => {
                const late = Math.max(1, Math.round((+r.generatedAt - +m.dueDate) / 86_400_000));
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-soft text-xs font-semibold text-rose tabular">{late}d</span>
                    <span className="min-w-0 flex-1">
                      <W id={m.weddingId} className="block truncate font-medium">{m.couple}</W>
                      <span className="text-xs text-muted-foreground">
                        {m.label} · due {formatDate(m.dueDate)}
                      </span>
                    </span>
                    <Amount rupees={m.amount} compact className="text-rose" />
                  </li>
                );
              })}
              {r.overduePayments.length > 6 && <li className="pt-2.5 text-xs text-muted-foreground">+ {r.overduePayments.length - 6} more</li>}
            </ul>
          )}
        </Card>

        {/* ── Vendor reliability ──────────────────────────────────────── */}
        <Card className="lg:col-span-6" title="Vendor reliability" icon="star" note={`On-time arrivals from day-of check-ins ${when}`}>
          {ranked.length === 0 ? (
            <Empty>No vendor check-ins {when}.</Empty>
          ) : (
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
              {ranked.slice(0, 8).map((v) => (
                <li key={v.id} className="flex items-center gap-3 border-b py-2.5 text-sm">
                  <Ring value={v.punctuality ?? 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {v.category.toLowerCase().replace("_", " ")} · {v.checkins} check-ins{v.avgLateMin ? ` · ~${v.avgLateMin} min late` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Ledger ───────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Icon name="notes" className="size-5 text-muted-foreground" /> {season ? "All weddings this season" : `Weddings ${when}`}
          </h2>
          <span className="text-xs text-muted-foreground">{r.rows.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Wedding</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Stage</th>
                <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-3 py-2.5 text-right font-medium">Vendor cost</th>
                <th className="px-3 py-2.5 text-right font-medium">Team cost</th>
                <th className="px-3 py-2.5 text-right font-medium">Profit</th>
                <th className="px-3 py-2.5 text-right font-medium">Margin</th>
                <th className="px-5 py-2.5 text-right font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {r.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                    No wedding events {when}.
                  </td>
                </tr>
              )}
              {r.rows.map((w) => (
                <tr key={w.id} className={cn("transition-colors hover:bg-muted/40", w.costed && w.profit < 0 && "bg-rose-soft/30")}>
                  <td className="px-5 py-3">
                    <W id={w.id} className="font-medium">{w.couple}</W>
                    <p className="text-xs text-muted-foreground">
                      {w.code} · {w.city}
                    </p>
                  </td>
                  <td className="px-3 py-3 tabular">{formatDate(w.startDate)}</td>
                  <td className="px-3 py-3">
                    <StagePill status={w.stage} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Amount rupees={w.revenue} compact />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Amount rupees={w.vendorCost} compact />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Amount rupees={w.teamCost} compact />
                    <p className="text-xs text-muted-foreground tabular">{Math.round(w.hours)} h</p>
                  </td>
                  <td className="px-3 py-3 text-right">{w.costed ? <Amount rupees={w.profit} compact signed /> : <span className="text-xs text-muted-foreground">No vendors yet</span>}</td>
                  <td className={cn("px-3 py-3 text-right tabular", w.margin < 0 ? "text-rose" : "")}>{w.costed ? pct(w.margin) : "—"}</td>
                  <td className="px-5 py-3 text-right tabular">{w.openTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function periodLabel(p: string) {
  return p === "today" ? "today" : p === "week" ? "this week" : p === "month" ? "this month" : "this season";
}

function Card({
  title,
  icon,
  note,
  tone,
  className,
  children,
}: {
  title: string;
  icon: IconName;
  note?: string;
  tone?: "rose";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-3xl border bg-card p-5", tone === "rose" && "border-rose/30", className)}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon name={icon} className={cn("size-4", tone === "rose" && "text-rose")} />
        {title}
      </h2>
      {note && <p className="mt-0.5 text-xs text-muted-foreground/80">{note}</p>}
      {children}
    </section>
  );
}

function Chip({ tone, children }: { tone: "teal" | "rose"; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular", tone === "teal" ? "bg-teal-soft text-teal" : "bg-rose-soft text-rose")}>{children}</span>;
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div>
      <p className={cn("font-semibold tabular", big ? "text-3xl" : "text-lg", tone)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Line({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className={cn("size-2 rounded-full", dot)} />
      <dt className="flex-1 text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular">{formatINRCompact(value)}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="grid min-h-32 place-items-center text-sm text-muted-foreground">{children}</p>;
}

/** Tiny column chart of profit per wedding in date order — the season's rhythm at a glance. */
function ProfitStrip({ rows }: { rows: SeasonReport["rows"] }) {
  const data = [...rows].sort((a, b) => +a.startDate - +b.startDate);
  if (data.length < 2) return null;
  const max = Math.max(...data.map((w) => Math.abs(w.profit)), 1);
  const H = 56;
  const bw = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="mt-5 h-14 w-full" aria-hidden>
      <line x1="0" x2="100" y1={H / 2} y2={H / 2} className="stroke-border" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
      {data.map((w, i) => {
        const h = (Math.abs(w.profit) / max) * (H / 2 - 2);
        return (
          <rect
            key={w.id}
            x={i * bw + bw * 0.18}
            width={bw * 0.64}
            y={w.profit >= 0 ? H / 2 - h : H / 2}
            height={Math.max(h, 0.8)}
            rx="0.6"
            className={cn("dash-grow-y", w.profit >= 0 ? "fill-teal" : "fill-rose")}
            style={{ transformOrigin: `0 ${H / 2}px`, animationDelay: `${i * 30}ms` }}
          />
        );
      })}
    </svg>
  );
}

/** Donut: of every rupee billed, how much went to vendors, the team, and what was left. */
function RupeeRing({ revenue, vendor, team, profit }: { revenue: number; vendor: number; team: number; profit: number }) {
  const total = Math.max(revenue, vendor + team, 1);
  const parts = [
    { label: "Vendors", value: vendor, cls: "stroke-marigold", dot: "bg-marigold" },
    { label: "Team", value: team, cls: "stroke-muted-foreground/50", dot: "bg-muted-foreground/50" },
    { label: profit >= 0 ? "Profit" : "Loss", value: Math.abs(profit), cls: profit >= 0 ? "stroke-teal" : "stroke-rose", dot: profit >= 0 ? "bg-teal" : "bg-rose" },
  ];
  const C = 2 * Math.PI * 40;
  let offset = 0;
  return (
    <div className="mt-3 flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-36 shrink-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="40" fill="none" className="stroke-muted" strokeWidth="11" />
        {parts.map((p) => {
          const len = (p.value / total) * C;
          const el = (
            <circle
              key={p.label}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="11"
              className={cn("dash-ring", p.cls)}
              strokeDasharray={`${Math.max(len - 1.2, 0)} ${C}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <p className="text-2xl font-semibold tabular">{formatINRCompact(revenue)}</p>
          <p className="text-xs text-muted-foreground">billed to couples</p>
        </div>
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-sm">
            <span className={cn("size-2 rounded-full", p.dot)} />
            <span className="flex-1 text-muted-foreground">{p.label}</span>
            <span className="font-medium tabular">{Math.round((p.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One stacked bar: how many weddings sit in each stage of the journey. */
function StageBar({ rows }: { rows: SeasonReport["rows"] }) {
  const total = rows.length || 1;
  const counts = JOURNEY.map((s) => ({ s, n: rows.filter((w) => w.stage === s).length })).filter((x) => x.n > 0);
  return (
    <div className="mt-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {counts.map(({ s, n }) => (
          <span key={s} className={cn("h-full border-r border-card last:border-0", STAGE_TONE[s])} style={{ width: `${(n / total) * 100}%` }} title={`${statusLabel(s)}: ${n}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {counts.map(({ s, n }) => (
          <span key={s} className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", STAGE_TONE[s])} />
            {statusLabel(s)} <span className="font-medium text-foreground tabular">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Diverging bars around a zero line: profit to the right in teal, losses to the left in rose. */
function ProfitBars({
  rows,
  W,
}: {
  rows: SeasonReport["rows"];
  W: (p: { id: string; children: React.ReactNode; className?: string }) => React.ReactNode;
}) {
  const max = Math.max(...rows.map((w) => Math.abs(w.profit)), 1);
  const hasLoss = rows.some((w) => w.profit < 0);
  const zero = hasLoss ? 30 : 0; // % of the track left of zero
  return (
    <ul className="mt-3 space-y-1.5">
      {rows.slice(0, 12).map((w, i) => {
        const len = (Math.abs(w.profit) / max) * (w.profit >= 0 ? 100 - zero : zero);
        return (
          <li key={w.id} className="grid grid-cols-[9rem_1fr_5rem_3rem] items-center gap-3 text-sm">
            <W id={w.id} className="truncate font-medium">{w.couple}</W>
            <div className="relative h-5 rounded-md bg-muted/50">
              {hasLoss && <span className="absolute inset-y-0 w-px bg-border" style={{ left: `${zero}%` }} />}
              <span
                className={cn("dash-grow-x absolute inset-y-1 rounded", w.profit >= 0 ? "bg-teal" : "bg-rose")}
                style={
                  w.profit >= 0
                    ? { left: `${zero}%`, width: `${Math.max(len, 0.6)}%`, transformOrigin: "left", animationDelay: `${i * 35}ms` }
                    : { right: `${100 - zero}%`, width: `${Math.max(len, 0.6)}%`, transformOrigin: "right", animationDelay: `${i * 35}ms` }
                }
              />
            </div>
            <Amount rupees={w.profit} compact signed className="text-right" />
            <span className={cn("text-right text-xs tabular", w.margin < 0 ? "text-rose" : "text-muted-foreground")}>{pct(w.margin)}</span>
          </li>
        );
      })}
      {rows.length > 12 && <li className="pt-1 text-xs text-muted-foreground">+ {rows.length - 12} more in the ledger below</li>}
    </ul>
  );
}

function Meter({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-xs">
      <span className="w-7 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("dash-grow-x h-full rounded-full", className)} style={{ width: `${Math.max(1.5, (value / max) * 100)}%`, transformOrigin: "left" }} />
      </div>
      <span className="w-16 text-right font-medium tabular">{formatINRCompact(value)}</span>
    </div>
  );
}

/** Small completion ring for a 0–1 score (vendor punctuality). */
function Ring({ value }: { value: number }) {
  const C = 2 * Math.PI * 15;
  const tone = value >= 0.9 ? "stroke-teal text-teal" : value >= 0.7 ? "stroke-marigold text-marigold" : "stroke-rose text-rose";
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" strokeLinecap="round" className={cn("dash-ring", tone)} strokeDasharray={`${value * C} ${C}`} />
      </svg>
      <span className={cn("text-[10px] font-semibold tabular", tone.split(" ")[1])}>{Math.round(value * 100)}</span>
    </span>
  );
}
