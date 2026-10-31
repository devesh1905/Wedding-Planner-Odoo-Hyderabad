import { PDFDocument } from "pdf-lib";
import { HttpError } from "@/lib/auth";
import { quoteSubmissionSchema } from "@/components/quotes/schema";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_PDF_BYTES + 256 * 1024;
async function boundedForm(request: Request): Promise<FormData> {
  const type = request.headers.get("Content-Type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) throw new HttpError(400, "Submit multipart form data");
  const length = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new HttpError(400, "Upload a PDF no larger than 5 MB");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing form data");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(400, "Upload a PDF no larger than 5 MB"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": type } }).formData(); }
  catch { throw new HttpError(400, "Invalid multipart form data"); }
}
export async function parseSubmission(request: Request) {
  const form = await boundedForm(request);
  if ([...form.keys()].some((key) => key !== "data" && key !== "file") || form.getAll("data").length !== 1 || form.getAll("file").length > 1) throw new HttpError(400, "Submit one quote and at most one PDF");
  const raw = form.get("data");
  if (typeof raw !== "string" || raw.length > 128 * 1024) throw new HttpError(400, "Missing or oversized quote details");
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new HttpError(400, "Quote details must be valid JSON"); }
  const data = quoteSubmissionSchema.parse(json);
  const file = form.get("file");
  let fileUrl: string | null = null;
  if (file !== null) {
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size === 0 || file.size > MAX_PDF_BYTES) throw new HttpError(400, "Upload a valid PDF no larger than 5 MB");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new HttpError(400, "The uploaded file is not a PDF");
    try {
      const document = await PDFDocument.load(bytes, { updateMetadata: false });
      if (document.getPageCount() === 0) throw new Error("Empty document");
    } catch { throw new HttpError(400, "This PDF is damaged, empty or password protected. Upload a readable PDF."); }
    // Bounded private storage avoids public upload URLs; the token-authorized file route serves bytes.
    fileUrl = `data:application/pdf;base64,${bytes.toString("base64")}`;
  }
  if (!fileUrl && data.lines.length === 0) throw new HttpError(400, "Upload a PDF or add at least one manual line item");
  return { data, fileUrl };
}
