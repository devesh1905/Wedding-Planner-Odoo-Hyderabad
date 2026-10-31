import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { signInput } from "@/lib/validation/enquiry";

// Couple signs on their phone. The signature image + name + time + IP are stored on the agreement,
// and the enquiry moves to SIGNED, which unlocks converting it into a wedding.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const data = signInput.parse(await req.json());
  const agreement = await db.agreement.findUnique({ where: { token } });
  if (!agreement) throw new HttpError(404, "This link is not valid");
  if (agreement.status === "SIGNED") throw new HttpError(409, "This agreement is already signed");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.$transaction(async (tx) => {
    await tx.agreement.update({
      where: { id: agreement.id },
      data: { status: "SIGNED", signedAt: new Date(), signerName: data.signerName, signatureUrl: data.signature, signerIp: ip },
    });
    await tx.enquiry.update({ where: { id: agreement.enquiryId }, data: { status: "SIGNED", nextFollowUp: null } });
    await logActivity(tx, { entity: "enquiry", entityId: agreement.enquiryId, action: "agreement_signed", payload: { by: data.signerName } });
  });
  return NextResponse.json({ ok: true });
});
