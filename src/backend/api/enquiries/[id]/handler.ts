import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { enquiryPatch } from "@/shared/validation/enquiry";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const enquiry = await db.enquiry.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
      meetings: { orderBy: { scheduledAt: "asc" } },
      agreement: { select: { id: true, token: true, status: true, sentAt: true, signedAt: true, signerName: true, signatureUrl: true } },
      wedding: { select: { id: true, code: true } },
    },
  });
  if (!enquiry) throw new HttpError(404, "Enquiry not found");
  const activity = await db.activityLog.findMany({
    where: { entity: "enquiry", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true } } },
  });
  return NextResponse.json({ ...enquiry, activity });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const data = enquiryPatch.parse(await req.json());
  const current = await db.enquiry.findUnique({ where: { id }, select: { status: true } });
  if (!current) throw new HttpError(404, "Enquiry not found");

  // SIGNED is only reachable through the couple's signature, never by dragging a card.
  if (data.status === "SIGNED" && current.status !== "SIGNED") {
    throw new HttpError(400, "An enquiry becomes Signed only when the couple signs the agreement");
  }
  if (current.status === "SIGNED" && data.status && data.status !== "SIGNED") {
    throw new HttpError(400, "Signed enquiries can't be moved back");
  }

  const enquiry = await db.enquiry.update({ where: { id }, data });
  if (data.status && data.status !== current.status) {
    await logActivity(db, { actorId: user.sub, entity: "enquiry", entityId: id, action: "status", payload: { from: current.status, to: data.status } });
  }
  return NextResponse.json(enquiry);
});
