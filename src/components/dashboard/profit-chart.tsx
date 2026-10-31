"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINRCompact } from "@/lib/format";

type Row = { code: string; couple: string; profit: number; revenue: number };

// Profit per wedding, losses in rose — answers "which weddings made money?" at a glance.
export function ProfitChart({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({ ...r, label: r.couple.split(" & ")[0] }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-35} textAnchor="end" height={56} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={64} tickLine={false} axisLine={false} />
          <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.3} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0]!.payload as Row;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{r.couple}</p>
                  <p className="text-muted-foreground">{r.code}</p>
                  <p className="mt-1">Revenue {formatINRCompact(r.revenue)}</p>
                  <p className={r.profit < 0 ? "text-rose" : "text-teal"}>Profit {formatINRCompact(r.profit)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
            {data.map((r) => (
              <Cell key={r.code} fill={r.profit < 0 ? "var(--rose)" : "var(--teal)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
