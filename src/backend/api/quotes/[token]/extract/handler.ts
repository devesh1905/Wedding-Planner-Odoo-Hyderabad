import { handle, requireUser } from "@/backend/auth";
import { quoteExtractSchema, quoteIdSchema } from "@/shared/schemas/quotes";
import { parseJson, privateJson } from "@/backend/api/quote-requests/shared";
import { extractAndPersistQuote } from "../../extraction";
import { portalView } from "../../portal";

type Context = { params: Promise<{ token: string }> };
export const POST = handle(async (request: Request, context: Context) => {
  await requireUser();
  // The shared dynamic segment is a UUID for planner actions and an invitation token for portal actions.
  const id = quoteIdSchema.parse((await context.params).token);
  const input = quoteExtractSchema.parse(request.body ? await parseJson(request) : {});
  return privateJson({ quote: portalView(await extractAndPersistQuote(id, input.updatedAt ? new Date(input.updatedAt) : undefined)) });
});
