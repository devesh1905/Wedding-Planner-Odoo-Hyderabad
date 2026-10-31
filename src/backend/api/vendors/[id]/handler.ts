import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { db } from "@/backend/db";
import { uuid } from "@/shared/validation/common";
import { vendorPatchSchema } from "@/shared/schemas/vendors";
import { parseJson, validateBackup, vendorDetailSelect, vendorSelect, vendorTransaction } from "../shared";

type Context = { params: Promise<{ id: string }> };
export const GET = handle(async (_request: Request, context: Context) => {
  await requireUser();
  const id = uuid.parse((await context.params).id).toLowerCase();
  const vendor = await db.vendor.findUnique({ where: { id }, select: vendorDetailSelect });
  if (!vendor) throw new HttpError(404, "Vendor not found");
  return NextResponse.json({ vendor });
});
export const PATCH = handle(async (request: Request, context: Context) => {
  await requireUser();
  const id = uuid.parse((await context.params).id).toLowerCase();
  const data = vendorPatchSchema.parse(await parseJson(request));
  const vendor = await vendorTransaction(async (tx) => {
    const existing = await tx.vendor.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Vendor not found");
    await validateBackup(tx, {
      id,
      category: data.category ?? existing.category,
      backupVendorId: data.backupVendorId === undefined ? existing.backupVendorId : data.backupVendorId,
      previousBackupId: existing.backupVendorId,
    });
    return tx.vendor.update({ where: { id }, data, select: vendorSelect });
  });
  return NextResponse.json({ vendor });
});
