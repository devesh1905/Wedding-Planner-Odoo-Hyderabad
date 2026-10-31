import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { meetingInput } from "@/shared/validation/enquiry";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const data = meetingInput.parse(await req.json());
  const enquiry = await db.enquiry.findUnique({ where: { id }, select: { status: true } });
  if (!enquiry) throw new HttpError(404, "Enquiry not found");

  const meeting = await db.$transaction(async (tx) => {
    const m = await tx.meeting.create({ data: { ...data, enquiryId: id } });
    // Booking a meeting moves early-stage enquiries forward automatically.
    if (enquiry.status === "NEW" || enquiry.status === "CONTACTED") {
      await tx.enquiry.update({ where: { id }, data: { status: "MEETING_BOOKED", nextFollowUp: data.scheduledAt } });
    }
    await logActivity(tx, { actorId: user.sub, entity: "enquiry", entityId: id, action: "meeting", payload: { at: data.scheduledAt.toISOString() } });
    return m;
  });
  return NextResponse.json(meeting, { status: 201 });
});
