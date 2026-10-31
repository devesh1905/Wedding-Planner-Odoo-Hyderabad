import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { enquiryInput } from "@/shared/validation/enquiry";

// Public web form. Saved straight away so an enquiry can never get lost;
// auto-assigned to the planner with the fewest open enquiries.
export const POST = handle(async (req: Request) => {
  const data = enquiryInput.parse(await req.json());

  const planners = await db.user.findMany({
    where: { role: "PLANNER" },
    select: { id: true, _count: { select: { enquiries: { where: { status: { notIn: ["SIGNED", "LOST"] } } } } } },
  });
  const assignee = planners.sort((a, b) => a._count.enquiries - b._count.enquiries)[0];

  const enquiry = await db.enquiry.create({
    data: {
      ...data,
      source: "WEB_FORM",
      assignedToId: assignee?.id,
      nextFollowUp: new Date(Date.now() + 24 * 3600_000),
    },
  });
  await logActivity(db, { entity: "enquiry", entityId: enquiry.id, action: "created", payload: { source: "WEB_FORM" } });

  return NextResponse.json({ id: enquiry.id, reference: enquiry.id.slice(0, 8).toUpperCase() }, { status: 201 });
});
