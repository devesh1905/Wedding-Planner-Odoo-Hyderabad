import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { handle, requireUser } from "@/backend/auth";
import { buildBrief } from "@/backend/ai/risk-brief";

// One brief per person per half hour; any change to weddings/payments (the "report" tag, revalidated
// by every successful write) rebuilds it, so a fixed risk disappears on the next look.
const cachedBrief = unstable_cache((sub: string, role: string, name: string) => buildBrief({ sub, role, name }), ["risk-brief"], {
  revalidate: 1800,
  tags: ["report"],
});

export const GET = handle(async () => {
  const s = await requireUser();
  return NextResponse.json(await cachedBrief(s.sub, s.role, s.name), { headers: { "Cache-Control": "private, no-store" } });
});
