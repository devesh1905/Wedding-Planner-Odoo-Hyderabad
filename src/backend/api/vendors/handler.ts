import { NextResponse } from "next/server";
import { handle, requireUser } from "@/backend/auth";
import { db } from "@/backend/db";
import { vendorFilterSchema, vendorSchema } from "@/shared/schemas/vendors";
import { parseJson, validateBackup, vendorSelect, vendorTransaction } from "./shared";

export const GET = handle(async (request: Request) => {
  await requireUser();
  const filter = vendorFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const vendors = await db.vendor.findMany({
    where: {
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.city ? { city: { equals: filter.city, mode: "insensitive" as const } } : {}),
      ...(filter.q ? { OR: ["name", "contactName", "phone", "email", "city"].map((field) => ({ [field]: { contains: filter.q, mode: "insensitive" } })) } : {}),
    },
    select: vendorSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return NextResponse.json({ vendors });
});
export const POST = handle(async (request: Request) => {
  await requireUser();
  const data = vendorSchema.parse(await parseJson(request));
  const vendor = await vendorTransaction(async (tx) => {
    await validateBackup(tx, { category: data.category, backupVendorId: data.backupVendorId });
    return tx.vendor.create({ data, select: vendorSelect });
  });
  return NextResponse.json({ vendor }, { status: 201 });
});
