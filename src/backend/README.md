# backend — server only

Never imported by browser code. Everything that touches the database, secrets or money rules on the write path lives here.

| Path | What it is |
|---|---|
| `api/<area>/handler.ts` | One file per REST endpoint. Shape: `requireUser()` → Zod `parse` → Prisma → `NextResponse.json`. `src/app/api/**/route.ts` only re-exports these. |
| `auth.ts`, `session.ts` | Signed session cookie, `requireUser()` / `requirePageUser()`, and `handle()` which turns thrown errors into JSON (400 for Zod, 401/403/404 for `HttpError`). |
| `db.ts` | The single Prisma client. |
| `reports.ts` | Founder dashboard numbers (cached, refreshed after every write). |
| `plan.ts` | Generates a wedding's task plan from templates when the booking payment lands. |
| `agreement.ts`, `tokens.ts`, `activity.ts`, `weddings.ts` | Agreement text, unguessable link tokens, the activity log, shared wedding lookups. |
| `ai/` | `gemini.ts` (the only model client), the quote reader, and the assistant features (`ask.ts`, `risk-brief.ts`). See `ai/README.md`. |
