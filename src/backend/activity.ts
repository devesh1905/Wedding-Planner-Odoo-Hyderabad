import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient | typeof db;

/** Append-only audit trail shown on enquiry/wedding timelines. */
export function logActivity(
  tx: Tx,
  entry: { actorId?: string | null; entity: string; entityId: string; action: string; payload?: Prisma.InputJsonValue },
) {
  return tx.activityLog.create({ data: { ...entry, actorId: entry.actorId ?? null } });
}
