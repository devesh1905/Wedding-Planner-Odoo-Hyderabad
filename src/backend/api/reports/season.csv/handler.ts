import { requireUser, handle } from "@/backend/auth";
import { getReport } from "@/backend/reports";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET = handle(async () => {
  await requireUser("FOUNDER");
  const r = await getReport();
  const header = [
    "Code",
    "Couple",
    "Date",
    "City",
    "Stage",
    "Revenue (INR)",
    "Received (INR)",
    "Vendor cost (INR)",
    "Team cost (INR)",
    "Profit (INR)",
    "Margin %",
    "Open tasks",
  ];
  const lines = r.rows.map((w) =>
    [
      w.code,
      w.couple,
      w.startDate.toISOString().slice(0, 10),
      w.city,
      w.stage,
      w.revenue,
      w.received,
      w.vendorCost,
      w.teamCost,
      w.profit,
      Math.round(w.margin * 100),
      w.openTasks,
    ]
      .map(esc)
      .join(","),
  );
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="royal-knot-season-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
