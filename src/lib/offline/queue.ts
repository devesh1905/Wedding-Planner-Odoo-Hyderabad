"use client";
import Dexie, { type Table } from "dexie";
import { useEffect, useState } from "react";

export type ActionType = "CHECKIN" | "SCHEDULE_STATUS" | "ISSUE";
export type OfflineAction = { clientId: string; type: ActionType; payload: unknown; createdAt: string; synced: boolean };
export type SyncStatus = { pending: number; syncing: boolean; lastSyncedAt?: string };
export type FlushResult = { sent: number; failed: number };
class ActionDatabase extends Dexie {
  actions!: Table<OfflineAction, string>;
  constructor() { super("knotos-offline-v1"); this.version(1).stores({ actions: "clientId, createdAt" }); }
}
let database: ActionDatabase | undefined;
function getDatabase(): ActionDatabase { return database ??= new ActionDatabase(); }
const listeners = new Set<() => void>();
let status: SyncStatus = { pending: 0, syncing: false };
let currentFlush: Promise<FlushResult> | undefined;
let stopAutoSync: (() => void) | undefined;
function publish(next: Partial<SyncStatus>): void { status = { ...status, ...next }; listeners.forEach((listener) => listener()); }

export async function enqueue(type: ActionType, payload: unknown): Promise<OfflineAction> {
  if (!["CHECKIN", "SCHEDULE_STATUS", "ISSUE"].includes(type)) throw new Error("Unsupported offline action");
  // Persist exactly the JSON that can travel to the server, rejecting circular values and BigInts now.
  const serialized = JSON.stringify(payload);
  if (serialized === undefined) throw new Error("Offline payload must be JSON serializable");
  const action: OfflineAction = { clientId: crypto.randomUUID(), type, payload: JSON.parse(serialized) as unknown, createdAt: new Date().toISOString(), synced: false };
  await getDatabase().actions.add(action);
  publish({ pending: (await pending()).length });
  return action;
}
export async function pending(): Promise<OfflineAction[]> {
  return (await getDatabase().actions.orderBy("createdAt").toArray()).filter((action) => !action.synced);
}
async function sendBatch(endpoint: string): Promise<FlushResult> {
  const actions = await pending();
  publish({ pending: actions.length });
  if (!actions.length) return { sent: 0, failed: 0 };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { sent: 0, failed: actions.length };
  publish({ syncing: true });
  try {
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actions }), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return { sent: 0, failed: actions.length };
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("acceptedClientIds" in body) || !Array.isArray(body.acceptedClientIds)) throw new Error("Sync response must acknowledge acceptedClientIds");
    // Duplicate IDs already committed by the server are acknowledged as successful too.
    const acknowledged = new Set(body.acceptedClientIds.filter((id): id is string => typeof id === "string"));
    const accepted = actions.filter((action) => acknowledged.has(action.clientId));
    await getDatabase().transaction("rw", getDatabase().actions, async () => {
      for (const action of accepted) await getDatabase().actions.update(action.clientId, { synced: true });
    });
    if (accepted.length) publish({ lastSyncedAt: new Date().toISOString() });
    return { sent: accepted.length, failed: actions.length - accepted.length };
  } catch {
    // Retain original IDs after a lost response so the server can deduplicate the retry.
    return { sent: 0, failed: actions.length };
  } finally { publish({ syncing: false, pending: (await pending()).length }); }
}
export function flush(endpoint = "/api/sync"): Promise<FlushResult> {
  // Online events and timers share one in-flight request in this browser context.
  return currentFlush ??= sendBatch(endpoint).finally(() => { currentFlush = undefined; });
}
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};
  if (stopAutoSync) return stopAutoSync;
  const sync = (): void => { void flush().catch(() => {}); };
  window.addEventListener("online", sync);
  const interval = window.setInterval(sync, 30_000);
  sync();
  return stopAutoSync = () => { window.removeEventListener("online", sync); window.clearInterval(interval); stopAutoSync = undefined; };
}
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return online;
}
export function useSyncStatus(): SyncStatus {
  const [snapshot, setSnapshot] = useState<SyncStatus>(status);
  useEffect(() => {
    const update = (): void => setSnapshot({ ...status });
    listeners.add(update);
    void pending().then((actions) => publish({ pending: actions.length })).catch(() => {});
    return () => { listeners.delete(update); };
  }, []);
  return snapshot;
}
/** Call after confirmed sign-out or user switch; warn first if actions are pending. */
export async function clearOfflineData(): Promise<void> {
  if (currentFlush) await currentFlush;
  await getDatabase().actions.clear(); status = { pending: 0, syncing: false }; publish({});
}
