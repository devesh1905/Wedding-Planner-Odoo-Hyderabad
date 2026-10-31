import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { renderAgreement } from "@/backend/agreement";
import { newToken } from "@/backend/tokens";

// Generate (or re-send) the service agreement and return the couple's signing link.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const enquiry = await db.enquiry.findUnique({ where: { id }, include: { agreement: true } });
  if (!enquiry) throw new HttpError(404, "Enquiry not found");
  if (enquiry.agreement?.status === "SIGNED") throw new HttpError(400, "Agreement is already signed");
  if (enquiry.status === "LOST") throw new HttpError(400, "Reopen the enquiry before sending an agreement");

  const agreement = await db.$transaction(async (tx) => {
    const a = enquiry.agreement
      ? await tx.agreement.update({
          where: { id: enquiry.agreement.id },
          data: { body: renderAgreement(enquiry), status: "SENT", sentAt: new Date() },
        })
      : await tx.agreement.create({
          data: { enquiryId: id, token: newToken(), body: renderAgreement(enquiry), status: "SENT", sentAt: new Date() },
        });
    await tx.enquiry.update({ where: { id }, data: { status: "AGREEMENT_SENT" } });
    await logActivity(tx, { actorId: user.sub, entity: "enquiry", entityId: id, action: "agreement_sent" });
    return a;
  });

  return NextResponse.json({ token: agreement.token, url: `/p/sign/${agreement.token}` });
});
