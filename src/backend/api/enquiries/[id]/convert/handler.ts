import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { convertInput } from "@/shared/validation/enquiry";
import { newToken } from "@/backend/tokens";
import { nextWeddingCode, paymentPlan } from "@/backend/weddings";

// Signed enquiry → Wedding, with the couple portal link and the staged payment plan.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const data = convertInput.parse(await req.json());

  const enquiry = await db.enquiry.findUnique({ where: { id }, include: { wedding: true } });
  if (!enquiry) throw new HttpError(404, "Enquiry not found");
  if (enquiry.status !== "SIGNED") throw new HttpError(400, "The couple must sign the agreement first");
  if (enquiry.wedding) throw new HttpError(409, "Already converted");

  const pkg = await db.package.findUnique({ where: { kind: data.packageKind } });
  if (!pkg) throw new HttpError(400, "Package not found");

  const wedding = await db.$transaction(async (tx) => {
    const w = await tx.wedding.create({
      data: {
        code: await nextWeddingCode(tx, data.startDate),
        enquiryId: id,
        packageId: pkg.id,
        leadPlannerId: data.leadPlannerId ?? enquiry.assignedToId ?? user.sub,
        partner1: enquiry.partner1,
        partner2: enquiry.partner2,
        phone: enquiry.phone,
        email: enquiry.email,
        startDate: data.startDate,
        endDate: data.endDate,
        city: data.city,
        venue: data.venue,
        guestCount: data.guestCount,
        theme: enquiry.theme,
        contractValue: data.contractValue,
        stage: "BOOKED",
        portalToken: newToken(),
        milestones: { create: paymentPlan(data.contractValue, data.startDate, data.endDate) },
      },
    });
    await logActivity(tx, { actorId: user.sub, entity: "enquiry", entityId: id, action: "converted", payload: { weddingId: w.id, code: w.code } });
    await logActivity(tx, { actorId: user.sub, entity: "wedding", entityId: w.id, action: "created", payload: { from: "enquiry" } });
    return w;
  });

  return NextResponse.json({ id: wedding.id, code: wedding.code }, { status: 201 });
});
