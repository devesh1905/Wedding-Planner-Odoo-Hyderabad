import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/icon";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { StagePill } from "@/components/common/stage-pill";
import { OwnerAvatar } from "@/components/common/owner-avatar";
import { Amount } from "@/components/common/amount";
import { CopyLinkButton } from "@/components/common/copy-link-button";
import { formatDate, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlanTab } from "@/components/weddings/plan-tab";
import { PaymentsTab } from "@/components/weddings/payments-tab";
import { OverviewTab } from "@/components/weddings/overview-tab";
import { VendorsTab } from "@/components/weddings/vendors-tab";
import { SettlementTab } from "@/components/weddings/settlement-tab";
import { QuoteRequestPanel } from "@/components/quotes/QuoteRequestPanel";
import { HoursTab } from "@/components/weddings/hours-tab";

const TABS: readonly { key: string; label: string; icon: IconName }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "plan", label: "Plan", icon: "checklist" },
  { key: "vendors", label: "Vendors & quotes", icon: "shop" },
  { key: "payments", label: "Payments", icon: "card" },
  { key: "settlement", label: "Settlement", icon: "wallet" },
  { key: "hours", label: "Team hours", icon: "clock" },
];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await db.wedding.findUnique({ where: { id }, select: { partner1: true, partner2: true } });
  return { title: w ? `${w.partner1} & ${w.partner2}` : "Wedding" };
}

export default async function WeddingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "overview";

  const wedding = await db.wedding.findUnique({
    where: { id },
    include: {
      package: true,
      leadPlanner: { select: { id: true, name: true, avatarColor: true } },
      tasks: {
        orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
        include: { owner: { select: { id: true, name: true, avatarColor: true } } },
      },
      milestones: { orderBy: { dueDate: "asc" } },
      bookings: {
        include: { vendor: { select: { id: true, name: true, phone: true } }, extras: true, payments: true, bills: true },
        orderBy: { category: "asc" },
      },
      issues: { where: { status: "OPEN" }, select: { id: true } },
      timeLogs: { orderBy: { date: "desc" }, include: { user: { select: { id: true, name: true, avatarColor: true, hourlyCost: true } } } },
    },
  });
  if (!wedding) notFound();

  const session = await requirePageUser();
  const users = await db.user.findMany({ select: { id: true, name: true, avatarColor: true, hourlyCost: true }, orderBy: { name: "asc" } });
  const done = wedding.tasks.filter((t) => t.stage === "DONE").length;
  const pct = wedding.tasks.length ? Math.round((done / wedding.tasks.length) * 100) : 0;
  const plain = JSON.parse(JSON.stringify(wedding)) as typeof wedding;

  return (
    <>
      <header className="-mx-4 -mt-6 mb-6 border-b bg-paper px-4 pt-6 pb-0 sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-8 lg:px-10 lg:pt-8">
        <Link href="/weddings" className="text-sm text-muted-foreground hover:text-foreground">
          ← All weddings
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StagePill status={wedding.stage} />
              <span className="text-xs text-muted-foreground tabular">{wedding.code}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{wedding.package.name}</span>
            </div>
            <h1 className="text-3xl font-semibold break-words sm:text-5xl">
              {wedding.partner1} & {wedding.partner2}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="size-4" /> {formatDate(wedding.startDate)} – {formatDate(wedding.endDate)} · {relativeDays(wedding.startDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="pin" className="size-4" /> {wedding.venue ? `${wedding.venue}, ` : ""}
                {wedding.city}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="guests" className="size-4" /> {wedding.guestCount} guests
              </span>
              {wedding.theme && (
                <span className="flex items-center gap-1.5">
                  <Icon name="palette" className="size-4" /> {wedding.theme}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Contract</p>
                <Amount rupees={wedding.contractValue} className="font-serif text-2xl" />
              </div>
              <ProgressRing pct={pct} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <CopyLinkButton path={`/p/${wedding.portalToken}`} label="Couple portal link" />
              <Button asChild size="sm">
                <Link href={`/weddings/${wedding.id}/live`}>
                  <Icon name="radar" className="size-4" /> Control room
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <nav className="-mb-px mt-6 flex gap-1 overflow-x-auto" aria-label="Wedding sections">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/weddings/${wedding.id}?tab=${t.key}`}
              scroll={false}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.key ? "border-maroon text-maroon" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name={t.icon} className="size-4" />
              {t.label}
            </Link>
          ))}
          <span className="ml-auto hidden items-center gap-2 pb-2 text-xs text-muted-foreground sm:flex">
            Lead <OwnerAvatar name={wedding.leadPlanner?.name} color={wedding.leadPlanner?.avatarColor} size="xs" />
          </span>
        </nav>
      </header>

      {tab === "overview" && <OverviewTab wedding={plain} openIssues={wedding.issues.length} />}
      {tab === "plan" && <PlanTab weddingId={wedding.id} tasks={plain.tasks} users={users} hasPlan={wedding.tasks.length > 0} />}
      {tab === "vendors" && <VendorsTab weddingId={wedding.id} bookings={plain.bookings} quotePanel={<QuoteRequestPanel weddingId={wedding.id} guestCount={wedding.guestCount} />} />}
      {tab === "payments" && <PaymentsTab milestones={plain.milestones} contractValue={wedding.contractValue} />}
      {tab === "hours" && <HoursTab weddingId={wedding.id} logs={plain.timeLogs} users={users} currentUserId={session.sub} />}
      {tab === "settlement" && <SettlementTab weddingId={wedding.id} stage={wedding.stage} bookings={plain.bookings} />}
    </>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-14 place-items-center" title={`${pct}% of tasks done`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--teal)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <span className="text-xs font-semibold tabular">{pct}%</span>
    </div>
  );
}
