# frontend — what runs in the browser

| Path | What it is |
|---|---|
| `components/<area>/` | UI grouped by screen: `enquiries`, `weddings`, `quotes`, `vendors`, `live` (wedding-day control room), `portal` (couple), `dashboard`, `home` (public site), `shell` (sidebar, Ctrl+K palette), `messages`. |
| `components/common/` | Small pieces reused across screens (page header, stage pill, WhatsApp link, scroll helpers). |
| `components/ui/` | shadcn/ui primitives (button, dialog, select…). Styling comes from design tokens in `src/app/globals.css`; no hard-coded colours. |
| `components/icons/` | One `Icon` component, so every icon has the same weight and size. |
| `lib/api-client.ts` | `api()` — fetch wrapper that throws the server's `{ error }` message. |
| `lib/offline/` | IndexedDB queue + service worker sync for the wedding-day screens (works with no signal). |
| `lib/qr/` | QR generation and scanning for vendor gate passes. |
