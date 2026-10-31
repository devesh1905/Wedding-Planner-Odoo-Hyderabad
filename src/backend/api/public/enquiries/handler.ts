import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { enquiryInput } from "@/shared/validation/enquiry";
import { estimate } from "@/shared/package-builder";

// Public web form. Saved straight away so an enquiry can never get lost;
// auto-assigned to the planner with the fewest open enquiries.
export const POST = handle(async (req: Request) => {
  const data = enquiryInput.parse(await req.json());

  const planners = await db.user.findMany({
    where: { role: "PLANNER" },
    select: { id: true, _count: { select: { enquiries: { where: { status: { notIn: ["SIGNED", "LOST"] } } } } } },
  });
  const assignee = planners.sort((a, b) => a._count.enquiries - b._count.enquiries)[0];

  // The saved estimate is always recomputed here from the selection; a client-sent figure is ignored.
  const picked = data.services?.length
    ? estimate({ guests: data.guestCount, services: data.services, events: data.events ?? [], planning: data.planning })
    : null;

  const enquiry = await db.enquiry.create({
    data: {
      ...data,
      estimateLow: picked?.low,
      estimateHigh: picked?.high,
      source: "WEB_FORM",
      assignedToId: assignee?.id,
      nextFollowUp: new Date(Date.now() + 24 * 3600_000),
    },
  });
  await logActivity(db, { entity: "enquiry", entityId: enquiry.id, action: "created", payload: { source: "WEB_FORM" } });

  // Echo back what was saved so the thank-you screen shows the authoritative figures, not the browser's.
  const { partner1, partner2, roughDate, city, guestCount, theme, planning, events, services, estimateLow, estimateHigh } = enquiry;
  return NextResponse.json(
    {
      id: enquiry.id,
      reference: enquiry.id.slice(0, 8).toUpperCase(),
      saved: { partner1, partner2, roughDate, city, guestCount, theme, planning, events, services, estimateLow, estimateHigh },
    },
    { status: 201 },
  );
});
