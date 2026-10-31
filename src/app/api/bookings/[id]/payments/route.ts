import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { bookingTotals } from "@/lib/settlement";
import { formatINR } from "@/lib/format";

const Body = z.object({
  amount: z.coerce.number({ message: "Enter the amount" }).positive("Amount must be more than zero").max(1e9).transform(Math.round),
  reference: z.string().trim().min(3, "Enter the payment reference (UTR / cheque no.)").max(60),
});

// Pay a vendor. Two guards stop double payment:
//  1. the reference is unique across all vendor payments (DB constraint), and
//  2. a payment can never exceed the remaining balance (checked inside the transaction).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const { amount, reference } = Body.parse(await req.json());

  const payment = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: { extras: true, payments: true, bills: true, vendor: { select: { name: true } } },
    });
    if (!booking) throw new HttpError(404, "Booking not found");
    const used = await tx.vendorPayment.findUnique({ where: { reference } });
    if (used) throw new HttpError(409, `Reference ${reference} was already used — this looks like a double payment`);

    const { balance } = bookingTotals(booking);
    if (balance <= 0) throw new HttpError(409, `${booking.vendor.name} is already fully paid`);
    if (amount > balance) throw new HttpError(400, `Only ${formatINR(balance)} is left to pay ${booking.vendor.name}`);

    const p = await tx.vendorPayment.create({ data: { bookingId: id, amount, reference } });
    await logActivity(tx, {
      actorId: user.sub,
      entity: "wedding",
      entityId: booking.weddingId,
      action: "vendor_paid",
      payload: { vendor: booking.vendor.name, amount, reference },
    });
    return p;
  });

  return NextResponse.json(payment, { status: 201 });
});
