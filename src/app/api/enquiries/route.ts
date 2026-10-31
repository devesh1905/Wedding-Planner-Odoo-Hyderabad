import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { staffEnquiryInput } from "@/lib/validation/enquiry";

export const GET = handle(async () => {
  await requireUser();
  const enquiries = await db.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { id: true, name: true, avatarColor: true } } },
  });
  return NextResponse.json(enquiries);
});

// Planner quick-add for enquiries that came in by phone / Instagram / WhatsApp.
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const data = staffEnquiryInput.parse(await req.json());
  const enquiry = await db.enquiry.create({
    data: { ...data, assignedToId: data.assignedToId ?? user.sub, nextFollowUp: new Date(Date.now() + 24 * 3600_000) },
  });
  await logActivity(db, { actorId: user.sub, entity: "enquiry", entityId: enquiry.id, action: "created", payload: { source: data.source } });
  return NextResponse.json(enquiry, { status: 201 });
});
