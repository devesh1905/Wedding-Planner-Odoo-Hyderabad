# Offline actions

Mount `useOnlineStatus()` and `useSyncStatus()` in the control room. Call `startAutoSync()` once; its return value stops timers and listeners.
Actions persist in IndexedDB before enqueue resolves. UUID `clientId` values never change on retries.
`POST /api/sync` receives `{ actions: OfflineAction[] }` and returns `{ acceptedClientIds: string[] }` for applied actions and previously applied duplicates. Unacknowledged actions stay pending.
The server must authenticate each batch, validate payloads and enforce a unique clientId in its transaction. Multiple tabs may retry the same action.
Register `/sw.js` at the application root after sign-in. Visit each control-room URL while connected before going offline.
API GET caching requires `X-Offline-Cache: allow`; credentials and token endpoints must never opt in.
On confirmed logout or a user switch, stop auto sync, warn about pending actions, call `clearOfflineData()` and send `{ type: "CLEAR_OFFLINE_CACHE" }` to the worker before admitting another account.
Failed requests keep queue entries. An HTTP success without explicit acknowledgements does not mark actions synced.
Browser storage and camera access require HTTPS or localhost.
