import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";

export async function parseJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new HttpError(400, "Send a valid JSON object"); }
}
export async function liveTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
        if (attempt < 2) continue;
        throw new HttpError(409, "Another update happened at the same time. Please retry.");
      }
      throw error;
    }
  }
  throw new HttpError(409, "Please retry the update");
}
export async function requireActiveWedding(tx: Prisma.TransactionClient | typeof db, weddingId: string): Promise<void> {
  const wedding = await tx.wedding.findUnique({ where: { id: weddingId }, select: { stage: true } });
  if (!wedding) throw new HttpError(404, "Wedding not found");
  if (wedding.stage === "CANCELLED") throw new HttpError(409, "This wedding is cancelled");
}
export async function validateOwner(tx: Prisma.TransactionClient, ownerId: string | null | undefined): Promise<void> {
  if (ownerId && !await tx.user.findUnique({ where: { id: ownerId }, select: { id: true } })) throw new HttpError(400, "Choose an existing team member as owner");
}
export const staffSelect = { id: true, name: true, avatarColor: true } satisfies Prisma.UserSelect;
export const issueSelect = {
  id: true, description: true, severity: true, status: true, ownerId: true, owner: { select: staffSelect },
} satisfies Prisma.IssueSelect;
export const itemSelect = {
  id: true, title: true, startsAt: true, durationMin: true, status: true, actualAt: true, notes: true, responsible: { select: staffSelect },
} satisfies Prisma.ScheduleItemSelect;
export const checkinSelect = {
  id: true, bookingId: true, clientId: true, arrivedAt: true, expectedAt: true, method: true,
} satisfies Prisma.CheckinSelect;
export function scanKey(token: string): string { return createHash("sha256").update(token).digest("hex"); }
