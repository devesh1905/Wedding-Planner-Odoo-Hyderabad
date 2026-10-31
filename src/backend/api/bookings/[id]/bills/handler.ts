import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { bookingTotals } from "@/shared/settlement";

const Body = z.object({
  billNo: z.string().trim().min(2, "Enter the bill number").max(40),
  amount: z.coerce.number({ message: "Enter the bill amount" }).positive("Amount must be more than zero").max(1e9).transform(Math.round),
});

// Vendor's final bill, matched against agreed amount + recorded extras.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const data = Body.parse(await req.json());
  const booking = await db.booking.findUnique({ where: { id }, include: { extras: true, payments: true, bills: true } });
  if (!booking) throw new HttpError(404, "Booking not found");

  const expected = bookingTotals({ ...booking, bills: [] }).expected;
  const diff = data.amount - expected;
  const match = diff === 0 ? "MATCHED" : diff > 0 ? "OVER_BILLED" : "UNDER_BILLED";
  const bill = await db.vendorBill.create({ data: { ...data, bookingId: id, match } });
  return NextResponse.json({ ...bill, expected, diff }, { status: 201 });
});
