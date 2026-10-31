import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, requireUser } from "@/backend/auth";
import { ask } from "@/backend/ai/ask";
import { AiUnavailableError } from "@/backend/ai/gemini";

const input = z.object({ question: z.string().trim().min(3, "Ask a full question").max(300) });

// POST /api/ask — plain-English question → filter plan → rows straight from the database.
export const POST = handle(async (req: Request) => {
  await requireUser();
  const { question } = input.parse(await req.json());
  try {
    const { plan, rows } = await ask(question);
    return NextResponse.json({ meaning: plan.meaning, entity: plan.entity, filters: plan.filters, rows });
  } catch (e) {
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 });
    throw e;
  }
});
