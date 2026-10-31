import type { VendorCategory } from "@/shared/schemas/vendors";
import type { z } from "zod";
import type { quoteLineSchema } from "./quotes";
type QuoteLine = z.output<typeof quoteLineSchema> & { id?: string; sortOrder?: number };
type QuoteSummary = {
  id: string; token: string; status: "INVITED" | "SUBMITTED" | "WON" | "NOT_SELECTED";
  perPlate: number | null; extraHourRate: number | null; total: number | null; notes: string | null;
  aiExtracted: boolean; aiReviewed: boolean; hasFile: boolean; submittedAt?: string | null; updatedAt?: string; lines: QuoteLine[];
};
export type QuoteRequestView = {
  id: string; weddingId: string; category: VendorCategory; title: string; requirements: string | null;
  guestCount: number | null; status: "OPEN" | "AWARDED" | "CLOSED"; createdAt: string;
  quotes: (QuoteSummary & { vendor: { id: string; name: string; phone: string } })[];
};
export type PortalQuote = QuoteSummary & {
  vendor: { name: string; phone: string };
  request: { id: string; title: string; category: VendorCategory; requirements: string | null; guestCount: number | null;
    status: "OPEN" | "AWARDED" | "CLOSED"; wedding: { partner1: string; partner2: string; city: string; startDate: string } };
};
