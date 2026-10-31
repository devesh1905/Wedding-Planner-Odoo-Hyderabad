import Link from "next/link";
import { AlertTriangle, ArrowRight, ListChecks, Store, Wallet } from "lucide-react";
import { StagePill } from "@/components/common/stage-pill";
import { OwnerAvatar } from "@/components/common/owner-avatar";
import { Amount } from "@/components/common/amount";
import { formatDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";

type W = {
  id: string;
  contractValue: number;
  tasks: { id: string; title: string; stage: string; dueDate: string | Date | null; owner: { name: string; avatarColor: string | null } | null }[];
  milestones: { id: string; label: string; amount: number; dueDate: string | Date; status: string }[];
  bookings: { id: string; category: string; agreedAmount: number; vendor: { name: string } }[];
};

export function OverviewTab({ wedding: w, openIssues }: { wedding: W; openIssues: number }) {
  const today = new Date(new Date().toDateString());
  const upcoming = w.tasks.filter((t) => t.stage !== "DONE").slice(0, 6);
  const overdue = w.tasks.filter((t) => t.stage !== "DONE" && t.dueDate && new Date(t.dueDate) < today).length;
  const received = w.milestones.filter((m) => m.status === "PAID").reduce((s, m) => s + m.amount, 0);
  const vendorCost = w.bookings.reduce((s, b) => s + b.agreedAmount, 0);
  const nextDue = w.milestones.find((m) => m.status === "DUE");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={ListChecks} label="Tasks open" value={w.tasks.filter((t) => t.stage !== "DONE").length} sub={overdue ? `${overdue} overdue` : "On track"} danger={overdue > 0} />
        <Stat icon={Wallet} label="Received from couple" value={<Amount rupees={received} compact />} sub={nextDue ? `Next: ${formatDate(nextDue.dueDate)}` : "All paid"} />
        <Stat icon={Store} label="Vendors booked" value={w.bookings.length} sub={<Amount rupees={vendorCost} compact className="font-normal" />} />
        <Stat icon={AlertTriangle} label="Open issues" value={openIssues} sub={openIssues ? "Needs attention" : "None"} danger={openIssues > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Coming up" href={`/weddings/${w.id}?tab=plan`}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks{w.tasks.length === 0 ? " — the plan is generated when the booking payment is recorded." : "."}</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((t) => {
                const late = t.dueDate && new Date(t.dueDate) < today;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <OwnerAvatar name={t.owner?.name} color={t.owner?.avatarColor} size="xs" />
                    <span className="flex-1">{t.title}</span>
                    {t.dueDate && <span className={cn("text-xs tabular", late ? "text-rose" : "text-muted-foreground")}>{relativeDays(t.dueDate)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Payments" href={`/weddings/${w.id}?tab=payments`}>
          <ul className="divide-y">
            {w.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="flex-1">{m.label}</span>
                <Amount rupees={m.amount} />
                <StagePill status={m.status === "DUE" && new Date(m.dueDate) < today ? "OVERDUE" : m.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Booked vendors" href={`/weddings/${w.id}?tab=vendors`} className="lg:col-span-2">
          {w.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendors booked yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {w.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span>
                    <span className="block text-xs text-muted-foreground capitalize">{b.category.toLowerCase()}</span>
                    {b.vendor.name}
                  </span>
                  <Amount rupees={b.agreedAmount} compact />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, danger }: { icon: React.ElementType; label: string; value: React.ReactNode; sub: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-2 font-serif text-3xl font-semibold tabular">{value}</p>
      <p className={cn("text-xs", danger ? "text-rose" : "text-muted-foreground")}>{sub}</p>
    </div>
  );
}

function Card({ title, href, className, children }: { title: string; href: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <Link href={href} className="flex items-center gap-1 text-sm text-maroon hover:underline">
          Open <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {children}
    </section>
  );
}
