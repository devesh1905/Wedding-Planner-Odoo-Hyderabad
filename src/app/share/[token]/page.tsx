import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSeasonReport } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Season report", robots: { index: false } };

// Read-only founder report opened from a share link. No login, no edit actions, expires.
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link || (link.expiresAt && link.expiresAt < new Date())) notFound();
  const report = await getSeasonReport();

  return (
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs tracking-[0.25em] text-eyebrow uppercase">The Royal Knot · shared report</p>
            <h1 className="text-4xl font-semibold">Season at a glance</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            As of {formatDateTime(report.generatedAt)}
            {link.expiresAt && ` · link valid until ${formatDateTime(link.expiresAt)}`}
          </p>
        </header>
        <DashboardView report={report} readOnly />
      </div>
    </main>
  );
}
