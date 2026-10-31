import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError } from "@/backend/auth";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/backend/session";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const POST = handle(async (req: Request) => {
  const { email, password } = Body.parse(await req.json());
  const user = await db.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect");
  }
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
});
