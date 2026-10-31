export type EnquiryCardData = {
  id: string;
  partner1: string;
  partner2: string;
  phone: string;
  source: string;
  status: string;
  roughDate: string | null;
  guestCount: number | null;
  maxBudget: number | null;
  city: string | null;
  theme: string | null;
  services?: string[];
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; avatarColor: string | null } | null;
  wedding: { id: string } | null;
  /** Another enquiry or booked wedding with the same mobile number (likely a repeat contact). */
  duplicateOf?: string | null;
};

export type Planner = { id: string; name: string };

/** Open enquiry untouched for 48 h, or follow-up date passed → needs attention. */
export function needsFollowUp(e: Pick<EnquiryCardData, "status" | "updatedAt" | "nextFollowUp">) {
  if (e.status === "SIGNED" || e.status === "LOST") return false;
  const now = Date.now();
  if (e.nextFollowUp && new Date(e.nextFollowUp).getTime() < now) return true;
  return now - new Date(e.updatedAt).getTime() > 48 * 3600_000;
}
