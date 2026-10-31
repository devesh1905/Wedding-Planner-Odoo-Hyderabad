import type { OfflineAction } from "@/lib/offline/queue";
import type { LiveData } from "./types";

/**
 * Applies not-yet-synced actions on top of the last server snapshot so the UI shows the planner's
 * own changes immediately. The snapshot itself is never mutated: once an action is acknowledged and
 * the snapshot is reloaded, the optimistic copy simply disappears.
 */
export function overlayPending(base: LiveData, actions: OfflineAction[]): LiveData {
  if (!actions.length) return base;
  let data: LiveData = { ...base };
  for (const action of actions) {
    const payload = (action.payload ?? {}) as Record<string, unknown>;
    if (action.type === "CHECKIN") {
      const bookingId = String(payload.bookingId ?? "");
      const arrivedAt = String(payload.arrivedAt ?? action.createdAt);
      const method = payload.method === "QR" ? "QR" : "MANUAL";
      data = { ...data, bookings: data.bookings.map((b) => (b.id === bookingId && !b.checkins.length ? { ...b, checkins: [{ arrivedAt, method }] } : b)) };
    } else if (action.type === "SCHEDULE_STATUS") {
      const itemId = String(payload.itemId ?? "");
      const status = payload.status as LiveData["events"][number]["scheduleItems"][number]["status"];
      const actualAt = typeof payload.actualAt === "string" ? payload.actualAt : null;
      data = { ...data, events: data.events.map((event) => ({ ...event, scheduleItems: event.scheduleItems.map((item) => (item.id === itemId ? { ...item, status, actualAt } : item)) })) };
    } else if (action.type === "ISSUE") {
      const ownerId = typeof payload.ownerId === "string" ? payload.ownerId : null;
      const issue = {
        id: `pending-${action.clientId}`, description: String(payload.description ?? ""), severity: (payload.severity as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
        status: "OPEN" as const, ownerId, owner: data.staff.find((person) => person.id === ownerId) ?? null,
      };
      data = { ...data, issues: [issue, ...data.issues] };
    }
  }
  return data;
}
