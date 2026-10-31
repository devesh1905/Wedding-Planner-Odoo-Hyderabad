import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, requireUser } from "@/backend/auth";
import { newToken } from "@/backend/tokens";

const Body = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) });

export const POST = handle(async (req: Request) => {
  await requireUser("FOUNDER");
  const { days } = Body.parse(await req.json());
  const link = await db.shareLink.create({
    data: { token: newToken(), scope: "season", expiresAt: new Date(Date.now() + days * 86_400_000) },
  });
  return NextResponse.json({ token: link.token, expiresAt: link.expiresAt }, { status: 201 });
});
