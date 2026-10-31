import { handle, HttpError } from "@/lib/auth";
import { tokenSchema } from "@/components/quotes/schema";
import { findPortalQuote } from "../../portal";
import { MAX_PDF_BYTES } from "../../submission";

type Context = { params: Promise<{ token: string }> };
export const GET = handle(async (_request: Request, context: Context) => {
  const token = tokenSchema.parse((await context.params).token);
  const quote = await findPortalQuote(token);
  const prefix = "data:application/pdf;base64,";
  if (!quote.fileUrl?.startsWith(prefix)) throw new HttpError(404, "No PDF has been uploaded for this quote");
  const bytes = Buffer.from(quote.fileUrl.slice(prefix.length), "base64");
  if (bytes.byteLength > MAX_PDF_BYTES || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new HttpError(404, "The quote PDF is unavailable");
  return new Response(bytes, { headers: {
    "Content-Type": "application/pdf", "Content-Length": String(bytes.byteLength),
    "Content-Disposition": `attachment; filename="quote-${quote.id}.pdf"`, "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'", "Referrer-Policy": "no-referrer",
  } });
});
