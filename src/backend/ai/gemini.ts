import "server-only";
import { z } from "zod";

/**
 * One small client for every assistant feature (ask, risk brief, negotiation, voice notes, call prep).
 * The model only ever returns JSON; Zod validates it, and invalid output gets exactly one repair
 * attempt with the validation errors. Callers always keep a non-AI fallback, so a missing key or an
 * outage never breaks a screen. Server only: the key never reaches the browser.
 */

export const aiConfigured = () => Boolean(process.env.AI_API_KEY);

export class AiUnavailableError extends Error {
  constructor(message = "The assistant is not available right now") {
    super(message);
  }
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

const geminiResponse = z.object({
  candidates: z.array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }) })).optional(),
});

async function callGemini(system: string, parts: Part[], temperature: number): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new AiUnavailableError("No assistant key is configured");
  const model = process.env.AI_MODEL || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new AiUnavailableError();
  }
  if (!res.ok) throw new AiUnavailableError(res.status === 429 ? "The assistant is busy — try again in a minute" : undefined);
  const raw = geminiResponse
    .parse(await res.json())
    .candidates?.[0]?.content.parts.map((p) => p.text ?? "")
    .join("");
  if (!raw) throw new AiUnavailableError("The assistant returned nothing");
  return raw;
}

/** Ask for JSON matching `schema`. `parts` may include audio (inlineData) as well as text. */
export async function askJson<T>({
  system,
  input,
  schema,
  temperature = 0.2,
}: {
  system: string;
  input: string | Part[];
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const parts: Part[] = typeof input === "string" ? [{ text: input }] : input;
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGemini(system + correction, parts, temperature);
    try {
      return schema.parse(JSON.parse(raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")));
    } catch (error) {
      correction = `\n\nYour previous JSON was invalid. Fix these problems and answer again: ${
        error instanceof z.ZodError ? JSON.stringify(error.issues).slice(0, 2000) : "invalid JSON syntax"
      }`;
    }
  }
  throw new AiUnavailableError("The assistant's answer could not be validated");
}
