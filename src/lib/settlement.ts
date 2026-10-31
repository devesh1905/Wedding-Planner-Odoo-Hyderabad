// Settlement maths, shared by the API (for guards) and the UI (for display). All amounts in whole rupees.

export type ExtraLike = { qty: number; unitPrice: number; clientUnitPrice: number | null; billableToClient: boolean; milestoneId: string | null };
export type BookingLike = {
  agreedAmount: number;
  extras: ExtraLike[];
  payments: { amount: number }[];
  bills: { amount: number; createdAt: Date | string }[];
};

export const extraCost = (e: ExtraLike) => Math.round(e.qty * e.unitPrice);
export const extraClientCharge = (e: ExtraLike) => Math.round(e.qty * (e.clientUnitPrice ?? e.unitPrice));

/**
 * What we owe a vendor = agreed amount + extras at the vendor's rate.
 * The vendor's own bill is compared against this, never trusted blindly.
 */
export function bookingTotals(b: BookingLike) {
  const extras = b.extras.reduce((s, e) => s + extraCost(e), 0);
  const expected = b.agreedAmount + extras;
  const paid = b.payments.reduce((s, p) => s + p.amount, 0);
  const latestBill = [...b.bills].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt))[0];
  const billDiff = latestBill ? latestBill.amount - expected : null;
  return {
    extras,
    expected,
    paid,
    balance: expected - paid,
    bill: latestBill?.amount ?? null,
    billDiff,
    match: latestBill == null ? "PENDING" : billDiff === 0 ? "MATCHED" : billDiff! > 0 ? "OVER_BILLED" : "UNDER_BILLED",
  } as const;
}
