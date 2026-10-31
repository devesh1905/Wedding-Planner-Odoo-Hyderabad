# shared — rules used by both the browser and the server

If a rule lives here, the form and the API cannot disagree about it.

| Path | What it is |
|---|---|
| `validation/` | Zod schemas for enquiries and common fields (Indian mobile numbers, dates, rupee amounts). |
| `schemas/` | Zod schemas and types per feature: quotes, live day, vendors, messages, voice notes. |
| `settlement.ts` | Money maths for extras, bills and balances — the server uses it to guard writes, the UI to display. |
| `package-builder.ts` | The "Build your package" estimate; the public form shows it and the server recomputes it on save. |
| `format.ts` | `formatINR()` (₹1,50,000 Indian grouping), dates in IST. |
| `reminders.ts`, `utils.ts` | WhatsApp reminder text, `cn()` class helper. |
