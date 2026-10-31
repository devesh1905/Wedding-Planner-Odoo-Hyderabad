import type { Prisma } from "@prisma/client";

const DAY = 86_400_000;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** Payment plan in stages: 20% on booking, 50% a month before, 30% after the event. */
export function paymentPlan(contractValue: number, startDate: Date, endDate: Date) {
  const booking = Math.round(contractValue * 0.2);
  const advance = Math.round(contractValue * 0.5);
  const final = contractValue - booking - advance; // remainder, so the three always add up exactly
  return [
    { type: "BOOKING" as const, label: "Booking payment", amount: booking, dueDate: new Date() },
    { type: "ADVANCE" as const, label: "Advance (1 month before)", amount: advance, dueDate: addDays(startDate, -30) },
    { type: "FINAL" as const, label: "Final payment (after event)", amount: final, dueDate: addDays(endDate, 7) },
  ];
}

/** Next wedding code for the season, e.g. RK-2026-014. */
export async function nextWeddingCode(tx: Prisma.TransactionClient, startDate: Date) {
  const year = startDate.getFullYear();
  const count = await tx.wedding.count({ where: { code: { startsWith: `RK-${year}-` } } });
  return `RK-${year}-${String(count + 1).padStart(3, "0")}`;
}
