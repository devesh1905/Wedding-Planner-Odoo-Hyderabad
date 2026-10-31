import { cn } from "@/lib/utils";
import { formatINR, formatINRCompact } from "@/lib/format";

/** Money display. Pass paise. `signed` colours positive teal / negative rose (profit, balances). */
export function Amount({
  paise,
  compact,
  signed,
  className,
}: {
  paise: number | null | undefined;
  compact?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const tone = signed && paise != null ? (paise < 0 ? "text-rose" : paise > 0 ? "text-teal" : "") : "";
  return <span className={cn("tabular font-medium", tone, className)}>{compact ? formatINRCompact(paise) : formatINR(paise)}</span>;
}
