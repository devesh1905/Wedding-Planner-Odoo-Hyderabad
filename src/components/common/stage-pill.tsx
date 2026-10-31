import { cn } from "@/lib/utils";

// One colour per status, everywhere. Keys cover every status enum in the schema.
type Tone = "neutral" | "info" | "accent" | "success" | "danger" | "brand";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-sky-soft text-sky",
  accent: "bg-marigold-soft text-[oklch(0.45_0.1_60)]",
  success: "bg-teal-soft text-teal",
  danger: "bg-rose-soft text-rose",
  brand: "bg-maroon-soft text-maroon",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // enquiry
  NEW: { label: "New", tone: "brand" },
  CONTACTED: { label: "Contacted", tone: "info" },
  MEETING_BOOKED: { label: "Meeting booked", tone: "info" },
  AGREEMENT_SENT: { label: "Agreement sent", tone: "accent" },
  SIGNED: { label: "Signed", tone: "success" },
  LOST: { label: "Lost", tone: "neutral" },
  // wedding
  BOOKED: { label: "Booked", tone: "brand" },
  PLANNING: { label: "Planning", tone: "info" },
  VENDORS: { label: "Vendors", tone: "info" },
  BIG_DAY: { label: "Big day", tone: "accent" },
  SETTLEMENT: { label: "Settlement", tone: "accent" },
  SETTLED: { label: "Settled", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  // task
  TO_PLAN: { label: "To plan", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "info" },
  WAITING: { label: "Waiting", tone: "accent" },
  DONE: { label: "Done", tone: "success" },
  // milestone
  DUE: { label: "Due", tone: "accent" },
  PAID: { label: "Paid", tone: "success" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  // quotes
  OPEN: { label: "Open", tone: "info" },
  AWARDED: { label: "Awarded", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
  INVITED: { label: "Invited", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  WON: { label: "Won", tone: "success" },
  NOT_SELECTED: { label: "Not selected", tone: "neutral" },
  // day-of
  UPCOMING: { label: "Upcoming", tone: "neutral" },
  LIVE: { label: "Live", tone: "accent" },
  DELAYED: { label: "Delayed", tone: "danger" },
  ARRIVED: { label: "Arrived", tone: "success" },
  LATE: { label: "Late", tone: "danger" },
  RESOLVED: { label: "Resolved", tone: "success" },
  // bills
  PENDING: { label: "Pending", tone: "neutral" },
  MATCHED: { label: "Matched", tone: "success" },
  OVER_BILLED: { label: "Over-billed", tone: "danger" },
  UNDER_BILLED: { label: "Under-billed", tone: "accent" },
};

export function StagePill({ status, label, className }: { status: string; label?: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONE[s.tone], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {label ?? s.label}
    </span>
  );
}

export const statusLabel = (status: string) => STATUS[status]?.label ?? status;
