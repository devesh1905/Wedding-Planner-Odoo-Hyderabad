import { handle, requireUser } from "@/lib/auth";
import { quoteExtractSchema, quoteIdSchema } from "@/components/quotes/schema";
import { parseJson, privateJson } from "@/app/api/quote-requests/shared";
import { extractAndPersistQuote } from "../../extraction";
import { portalView } from "../../portal";

export const maxDuration = 90;
type Context = { params: Promise<{ token: string }> };
export const POST = handle(async (request: Request, context: Context) => {
  await requireUser();
  // The shared dynamic segment is a UUID for planner actions and an invitation token for portal actions.
  const id = quoteIdSchema.parse((await context.params).token);
  const input = quoteExtractSchema.parse(request.body ? await parseJson(request) : {});
  return privateJson({ quote: portalView(await extractAndPersistQuote(id, input.updatedAt ? new Date(input.updatedAt) : undefined)) });
});
