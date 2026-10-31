# ai — the quote reader and the assistant

One rule for everything here: **code finds the facts, the model only reads, words or picks from a fixed menu.** Every feature has a non-AI fallback, so a missing key or an outage never breaks a screen.

| File | What it does |
|---|---|
| `gemini.ts` | The one model client: JSON-only answers, Zod-validated, one repair attempt, `AiUnavailableError` on any failure. |
| `extract-quote.ts`, `quote-schema.ts`, `prompts.ts`, `store-quote.ts`, `compare.ts` | PDF quote → fixed structure → planner review → saved quote → side-by-side comparison. |
| `ask.ts` | Ask KnotOS: question → filter plan from a fixed vocabulary → Prisma query built only in this file. |
| `risk-brief.ts` | Morning brief: rules find and rank risks; the model rewrites them and cannot add any. |
| `fixtures/` | Saved results for the three demo PDFs (used offline or without a key; matched by text fingerprint). |

The counter-offer, voice-note and call-prep endpoints live with their features in `src/backend/api/` and use `gemini.ts` the same way.

## Quote reader rules

1. The PDF reader extracts embedded text; scanned images require manual entry.
2. Uploads are limited to 15 MB and extracted text to 100,000 characters.
3. A fixed prompt requests facts and uses null for unknown numbers.
4. Zod validates every field and rejects extra keys and negative prices.
5. Invalid JSON gets one repair attempt with validation errors included.
6. Configure AI_PROVIDER, AI_API_KEY and AI_MODEL on the server only; Gemini is the default.
7. Other services use AI_ENDPOINT and AI_PROTOCOL=chat or messages; AI_HEADERS_JSON supplies version headers.
8. Known demo text fingerprints select fixtures without a key or during a service outage; unknown documents never match.
9. Comparison preserves exclusions and unknown prices; quoted totals determine the cheapest vendor.
10. Extraction and database money are rupees; round fractional amounts once on save, and planners review before saving.
