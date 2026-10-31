import Link from "next/link";
import { SearchButton } from "@/frontend/components/shell/search-button";
import { Download } from "lucide-react";
import { requirePageUser } from "@/backend/auth";
import { getReport, type Period } from "@/backend/reports";
import { PageHeader } from "@/frontend/components/common/page-header";
import { Button } from "@/frontend/components/ui/button";
import { DashboardView } from "@/frontend/components/dashboard/dashboard-view";
import { ShareDialog } from "@/frontend/components/dashboard/share-dialog";
import { RiskBrief } from "@/frontend/components/dashboard/risk-brief";
import { cn } from "@/shared/utils";

export const metadata = { title: "Dashboard" };

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "season", label: "Season" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePageUser("FOUNDER");
  const { period: p } = await searchParams;
  const period = (PERIODS.some((x) => x.key === p) ? p : "season") as Period;
  const report = await getReport(period);

  return (
    <>
      <PageHeader
        title={{ today: "Today", week: "This week", month: "This month", season: "Season" }[period] + " at a glance"}
        subtitle="Which weddings made money, what's still unfinished, and what's due"
        actions={
          <>
            <div className="flex max-w-full flex-wrap rounded-lg border bg-card p-0.5">
              {PERIODS.map((x) => (
                <Link
                  key={x.key}
                  href={`/dashboard?period=${x.key}`}
                  className={cn("rounded-md px-3 py-1.5 text-sm", period === x.key ? "bg-cta text-cta-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {x.label}
                </Link>
              ))}
            </div>
            <SearchButton />
            <Button asChild variant="outline">
              <a href="/api/reports/season.csv">
                <Download /> CSV
              </a>
            </Button>
            <ShareDialog />
          </>
        }
      />
      <RiskBrief className="mb-4" />
      <DashboardView report={report} />
    </>
  );
}
