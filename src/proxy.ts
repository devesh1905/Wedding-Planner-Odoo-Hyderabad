import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Staff pages need a session. Public: /login, /enquire, couple portal /p, vendor portal /v, share links /share.
const PUBLIC = [/^\/login/, /^\/enquire/, /^\/p\//, /^\/v\//, /^\/share\//, /^\/api\/public\//, /^\/api\/auth\//];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/" || PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  // API routes do their own auth checks and return JSON 401s.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:png|jpg|svg|webp|pdf)$).*)"],
};
