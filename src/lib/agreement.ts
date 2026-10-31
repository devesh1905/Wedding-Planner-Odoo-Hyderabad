import { coupleName, formatDate, formatINR } from "./format";

type AgreementEnquiry = {
  partner1: string;
  partner2: string;
  phone: string;
  roughDate: Date | null;
  guestCount: number | null;
  theme: string | null;
  city: string | null;
  maxBudget: number | null;
};

/** Service agreement text, frozen into the Agreement row when sent so later edits don't change what was signed. */
export function renderAgreement(e: AgreementEnquiry) {
  const today = formatDate(new Date());
  return `SERVICE AGREEMENT

This agreement is made on ${today} between The Royal Knot Wedding Planners ("the Agency") and ${coupleName(e.partner1, e.partner2)} ("the Couple"), contact ${e.phone}.

1. THE WEDDING
   Proposed dates: ${e.roughDate ? `around ${formatDate(e.roughDate)}` : "to be confirmed"}
   Location: ${e.city ?? "to be confirmed"}
   Expected guests: ${e.guestCount ?? "to be confirmed"}
   Theme: ${e.theme ?? "to be discussed"}
   Indicative budget: ${e.maxBudget ? `up to ${formatINR(e.maxBudget)}` : "to be discussed"}

2. SERVICES
   The Agency will plan and coordinate the wedding as per the package chosen (Full-Service or Partial / Day-of), including vendor sourcing, scheduling and on-the-day management as applicable.

3. CONFIDENTIALITY
   Vendor lists, floor plans and pricing shared by the Agency are confidential and shared only after this agreement is signed.

4. PAYMENTS
   Fees are paid in stages: a booking payment on confirmation, an advance about one month before the wedding, and a final payment after the event. Additions requested by the Couple (extra guests, extended hours, etc.) are billed at agreed rates.

5. CANCELLATION
   The booking payment is non-refundable. Vendor costs already committed on the Couple's behalf are payable if the wedding is cancelled.

6. ACCEPTANCE
   By signing below, the Couple confirms they have read and accept these terms.`;
}
