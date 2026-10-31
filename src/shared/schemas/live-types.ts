import type { VendorCategory } from "@prisma/client";
export type LiveStaff = { id: string; name: string; avatarColor: string | null };
export type LiveScheduleItem = {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  status: "UPCOMING" | "LIVE" | "DONE" | "DELAYED";
  actualAt: string | null;
  notes: string | null;
  responsible: LiveStaff | null;
};
export type LiveIssue = {
  id: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "RESOLVED";
  ownerId: string | null;
  owner: LiveStaff | null;
};
export type LiveBooking = {
  id: string;
  expectedArrival: string | null;
  scanKey: string;
  vendor: { id: string; name: string; phone: string; category: VendorCategory; backupVendor: { id: string; name: string; phone: string } | null };
  checkins: { arrivedAt: string; method: "QR" | "MANUAL" }[];
};
export type LiveData = {
  events: { id: string; name: string; startsAt: string; scheduleItems: LiveScheduleItem[] }[];
  bookings: LiveBooking[];
  issues: LiveIssue[];
  staff: LiveStaff[];
};
