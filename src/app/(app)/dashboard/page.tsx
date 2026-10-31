import Link from "next/link";
import { Download } from "lucide-react";
import { requirePageUser } from "@/lib/auth";
import { getSeasonReport, type Period } from "@/lib/reports";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ShareDialog } from "@/components/dashboard/share-dialog";
import { cn } from "@/lib/utils";

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
  const report = await getSeasonReport(period);

  return (
    <>
      <PageHeader
        title="Season at a glance"
        subtitle="Which weddings made money, what's still unfinished, and what's due"
        actions={
          <>
            <div className="flex rounded-lg border bg-card p-0.5">
              {PERIODS.map((x) => (
                <Link
                  key={x.key}
                  href={`/dashboard?period=${x.key}`}
                  className={cn("rounded-md px-3 py-1.5 text-sm", period === x.key ? "bg-maroon text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {x.label}
                </Link>
              ))}
            </div>
            <Button asChild variant="outline">
              <a href="/api/reports/season.csv">
                <Download /> CSV
              </a>
            </Button>
            <ShareDialog />
          </>
        }
      />
      <DashboardView report={report} />
    </>
  );
}
