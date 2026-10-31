import Link from "next/link";
import { AlertTriangle, CalendarHeart, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import type { SeasonReport } from "@/lib/reports";
import { Amount } from "@/components/common/amount";
import { StagePill } from "@/components/common/stage-pill";
import { formatDate, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProfitChart } from "./profit-chart";

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/** Shared by the founder dashboard and the read-only share page (links disabled there). */
export function DashboardView({ report: r, readOnly }: { report: SeasonReport; readOnly?: boolean }) {
  const ranked = [...r.scorecards].filter((v) => v.punctuality != null).sort((a, b) => (b.punctuality ?? 0) - (a.punctuality ?? 0));
  const best = ranked.slice(0, 4);
  const worst = ranked.filter((v) => (v.punctuality ?? 1) < 1).slice(-4).reverse();
  const W = ({ id, children }: { id: string; children: React.ReactNode }) =>
    readOnly ? <>{children}</> : <Link href={`/weddings/${id}`} className="hover:text-maroon hover:underline">{children}</Link>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={CalendarHeart} label="Active weddings" value={r.kpi.activeWeddings} sub={`${r.rows.length} this season`} />
        <Kpi icon={IndianRupee} label="Season revenue" value={formatINRCompact(r.kpi.seasonRevenue)} sub={`${formatINRCompact(r.kpi.collectedInPeriod)} collected ${periodLabel(r.period)}`} />
        <Kpi
          icon={TrendingUp}
          label="Season profit"
          value={<span className={r.kpi.seasonProfit < 0 ? "text-rose" : "text-teal"}>{formatINRCompact(r.kpi.seasonProfit)}</span>}
          sub={`${pct(r.kpi.avgMargin)} avg margin · ${r.kpi.lossMaking} loss-making · ${r.kpi.costedWeddings} weddings with vendors booked`}
          danger={r.kpi.lossMaking > 0}
        />
        <Kpi icon={Wallet} label="Due in next 4 weeks" value={formatINRCompact(r.kpi.dueIn4Weeks)} sub={`${r.overduePayments.length} payments overdue`} danger={r.overduePayments.length > 0} />
        <Kpi icon={AlertTriangle} label="Open issues" value={r.kpi.openIssues} sub={r.kpi.openIssues ? "From day-of control rooms" : "All clear"} danger={r.kpi.openIssues > 0} />
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold">Profit by wedding</h2>
            <p className="text-sm text-muted-foreground">Revenue (contract + add-ons) − vendor costs (agreed + extras) − team hours × hourly cost</p>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-teal" /> Profit
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-rose" /> Loss
            </span>
          </div>
        </div>
        <ProfitChart rows={r.rows.filter((w) => w.costed)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-2xl font-semibold">Cash flow ahead</h2>
          <p className="mb-4 text-sm text-muted-foreground">Client payments due in vs vendor balances due out</p>
          <div className="space-y-4">
            {r.horizon.map((h) => {
              const max = Math.max(...r.horizon.map((x) => Math.max(x.moneyIn, x.moneyOut)), 1);
              return (
                <div key={h.days} className="space-y-1.5">
                  <p className="text-sm font-medium">Next {h.days === 7 ? "week" : `${h.days / 7} weeks`}</p>
                  <Bar label="In" value={h.moneyIn} max={max} className="bg-teal" />
                  <Bar label="Out" value={h.moneyOut} max={max} className="bg-rose" />
                  <p className={cn("text-right text-xs tabular", h.moneyIn - h.moneyOut < 0 ? "text-rose" : "text-teal")}>
                    Net {formatINRCompact(h.moneyIn - h.moneyOut)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-2xl font-semibold">Vendor scorecards</h2>
          <p className="mb-4 text-sm text-muted-foreground">Punctuality from day-of check-ins · bill accuracy from bill matching</p>
          <ScoreList title="Most reliable" items={best} />
          {worst.length > 0 && <ScoreList title="Often late" items={worst} danger />}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-2xl font-semibold">Needs attention</h2>
          <p className="mb-4 text-sm text-muted-foreground">Overdue client payments</p>
          {r.overduePayments.length === 0 ? (
            <p className="text-sm text-teal">Nothing overdue.</p>
          ) : (
            <ul className="divide-y text-sm">
              {r.overduePayments.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <W id={m.weddingId}>
                      <span className="block truncate font-medium">{m.couple}</span>
                    </W>
                    <span className="text-xs text-muted-foreground">
                      {m.label} · due {formatDate(m.dueDate)}
                    </span>
                  </span>
                  <Amount rupees={m.amount} compact className="text-rose" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between p-5">
          <h2 className="text-2xl font-semibold">All weddings this season</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Wedding</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Stage</th>
                <th className="p-3 text-right font-medium">Revenue</th>
                <th className="p-3 text-right font-medium">Vendor cost</th>
                <th className="p-3 text-right font-medium">Team cost</th>
                <th className="p-3 text-right font-medium">Profit</th>
                <th className="p-3 text-right font-medium">Margin</th>
                <th className="p-3 text-right font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((w) => (
                <tr key={w.id} className={cn("border-t", w.costed && w.profit < 0 && "bg-rose-soft/40")}>
                  <td className="p-3">
                    <W id={w.id}>
                      <span className="font-medium">{w.couple}</span>
                    </W>
                    <p className="text-xs text-muted-foreground">
                      {w.code} · {w.city}
                    </p>
                  </td>
                  <td className="p-3 tabular">{formatDate(w.startDate)}</td>
                  <td className="p-3">
                    <StagePill status={w.stage} />
                  </td>
                  <td className="p-3 text-right">
                    <Amount rupees={w.revenue} compact />
                  </td>
                  <td className="p-3 text-right">
                    <Amount rupees={w.vendorCost} compact />
                  </td>
                  <td className="p-3 text-right">
                    <Amount rupees={w.teamCost} compact />
                    <p className="text-xs text-muted-foreground tabular">{Math.round(w.hours)} h</p>
                  </td>
                  <td className="p-3 text-right">{w.costed ? <Amount rupees={w.profit} compact signed /> : <span className="text-xs text-muted-foreground">No vendors yet</span>}</td>
                  <td className={cn("p-3 text-right tabular", w.margin < 0 ? "text-rose" : "")}>{w.costed ? pct(w.margin) : "—"}</td>
                  <td className="p-3 text-right tabular">{w.openTasks}</td>
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

function Kpi({ icon: Icon, label, value, sub, danger }: { icon: React.ElementType; label: string; value: React.ReactNode; sub: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-semibold tabular">{value}</p>
      <p className={cn("text-xs", danger ? "text-rose" : "text-muted-foreground")}>{sub}</p>
    </div>
  );
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
      <span className="w-16 text-right tabular">{formatINRCompact(value)}</span>
    </div>
  );
}

function ScoreList({ title, items, danger }: { title: string; items: SeasonReport["scorecards"]; danger?: boolean }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="space-y-2 text-sm">
        {items.map((v) => (
          <li key={v.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{v.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {v.category.toLowerCase()} · {v.hired} bookings{v.avgLateMin ? ` · avg ${v.avgLateMin} min late` : ""}
              </span>
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular", danger ? "bg-rose-soft text-rose" : "bg-teal-soft text-teal")}>
              {pct(v.punctuality)} on time
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
