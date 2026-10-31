import { Prisma, type VendorCategory } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { db } from "@/lib/db";

export const vendorSelect = {
  id: true, name: true, category: true, contactName: true, phone: true, email: true, city: true,
  notes: true, backupVendorId: true,
  backupVendor: { select: { id: true, name: true, phone: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.VendorSelect;
export const vendorDetailSelect = {
  ...vendorSelect,
  bookings: {
    orderBy: { createdAt: "desc" },
    select: { id: true, agreedAmount: true, createdAt: true,
      wedding: { select: { id: true, partner1: true, partner2: true, startDate: true } } },
  },
} satisfies Prisma.VendorSelect;
export async function parseJson(request: Request): Promise<unknown> {
  try { return await request.json(); }
  catch { throw new HttpError(400, "Send a valid JSON object"); }
}
function fieldError(field: string, message: string): never {
  throw new z.ZodError([{ code: "custom", path: [field], message }]);
}
export async function validateBackup(
  tx: Prisma.TransactionClient,
  input: { id?: string; category: VendorCategory; backupVendorId: string | null; previousBackupId?: string | null },
): Promise<void> {
  if (input.id) {
    const dependent = await tx.vendor.findFirst({ where: { backupVendorId: input.id, category: { not: input.category } }, select: { id: true } });
    if (dependent) fieldError("category", "Remove this vendor as a backup for other categories before changing its category");
  }
  if (!input.backupVendorId) return;
  if (input.backupVendorId === input.id) fieldError("backupVendorId", "A vendor cannot be its own backup");
  const backup = await tx.vendor.findUnique({ where: { id: input.backupVendorId }, select: { category: true, backupVendorId: true } });
  if (!backup) fieldError("backupVendorId", "The selected backup vendor no longer exists");
  if (backup.category !== input.category) fieldError("backupVendorId", "Choose a backup in the same vendor category");
  // Existing imported links may be reciprocal; unchanged links remain editable without adding new cycles.
  if (input.previousBackupId === input.backupVendorId) return;
  const visited = new Set<string>();
  let cursor: string | null = input.backupVendorId;
  while (cursor) {
    if (cursor === input.id) fieldError("backupVendorId", "Choose a backup that does not create a circular backup chain");
    // A pre-existing imported pair does not become a new cycle when another vendor points to it.
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const next: { backupVendorId: string | null } | null = await tx.vendor.findUnique({ where: { id: cursor }, select: { backupVendorId: true } });
    cursor = next?.backupVendorId ?? null;
  }
}
/** Serializable retries prevent two simultaneous edits from creating an unchecked backup cycle. */
export async function vendorTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new HttpError(409, "Another vendor edit happened at the same time. Please retry.");
      }
      throw error;
    }
  }
  throw new HttpError(409, "Please retry the vendor update");
}
