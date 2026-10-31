import type { VendorCategory } from "./schema";
export type VendorSummary = {
  id: string;
  name: string;
  category: VendorCategory;
  contactName: string | null;
  phone: string;
  email: string | null;
  city: string;
  notes: string | null;
  backupVendorId: string | null;
  backupVendor: { id: string; name: string; phone: string } | null;
  _count?: { bookings: number };
};
export type VendorDetail = VendorSummary & {
  bookings: {
    id: string;
    agreedAmount: number;
    createdAt: string;
    wedding: { id: string; partner1: string; partner2: string; startDate: string };
  }[];
};
