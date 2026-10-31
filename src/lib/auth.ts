import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** For server components / pages: redirect to login if signed out. */
export async function requirePageUser(role?: SessionPayload["role"]) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (role && s.role !== role) redirect("/weddings");
  return s;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For API routes: throws HttpError(401/403); wrap handlers with `handle()`. */
export async function requireUser(role?: SessionPayload["role"]) {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in");
  if (role && s.role !== role) throw new HttpError(403, "Not allowed");
  return s;
}

/** Wraps an API handler: turns HttpError / ZodError / unknown errors into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e && typeof e === "object" && "issues" in e) {
        const issues = (e as { issues: { path: PropertyKey[]; message: string }[] }).issues;
        return NextResponse.json(
          { error: issues[0]?.message ?? "Invalid input", fields: Object.fromEntries(issues.map((i) => [i.path.join("."), i.message])) },
          { status: 400 },
        );
      }
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
        return NextResponse.json({ error: "This record already exists" }, { status: 409 });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
