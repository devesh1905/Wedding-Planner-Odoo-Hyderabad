import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const Body = z.object({
  description: z.string().trim().min(3, "Describe the extra").max(160),
  qty: z.coerce.number({ message: "Enter a quantity" }).positive("Quantity must be more than zero").max(10000),
  unitPrice: z.coerce.number({ message: "Enter the vendor's rate" }).nonnegative().max(1e8).transform(Math.round),
  clientUnitPrice: z.coerce.number().nonnegative().max(1e8).transform(Math.round).optional(),
  billableToClient: z.boolean().default(true),
});

// Something beyond the agreed terms — e.g. 60 extra plates or 2 more DJ hours.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const data = Body.parse(await req.json());
  const booking = await db.booking.findUnique({ where: { id }, select: { weddingId: true, vendor: { select: { name: true } } } });
  if (!booking) throw new HttpError(404, "Booking not found");

  const extra = await db.extra.create({ data: { ...data, bookingId: id } });
  await logActivity(db, {
    actorId: user.sub,
    entity: "wedding",
    entityId: booking.weddingId,
    action: "extra_added",
    payload: { vendor: booking.vendor.name, description: data.description, amount: Math.round(data.qty * data.unitPrice) },
  });
  return NextResponse.json(extra, { status: 201 });
});
