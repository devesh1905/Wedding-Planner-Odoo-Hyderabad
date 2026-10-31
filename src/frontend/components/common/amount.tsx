import { cn } from "@/shared/utils";
import { formatINR, formatINRCompact } from "@/shared/format";

/** Money display. Pass rupees. `signed` colours positive teal / negative rose (profit, balances). */
export function Amount({
  rupees,
  compact,
  signed,
  className,
}: {
  rupees: number | null | undefined;
  compact?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const tone = signed && rupees != null ? (rupees < 0 ? "text-rose" : rupees > 0 ? "text-teal" : "") : "";
  return <span className={cn("tabular font-medium", tone, className)}>{compact ? formatINRCompact(rupees) : formatINR(rupees)}</span>;
}
