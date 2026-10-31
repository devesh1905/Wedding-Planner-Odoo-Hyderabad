import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageUser } from "@/backend/auth";
import { db } from "@/backend/db";
import { PageHeader } from "@/frontend/components/common/page-header";
import { QrPassSheet } from "@/frontend/components/live/qr-pass-sheet";
export const metadata = { title: "Vendor QR passes" };
export default async function QrPassesPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const wedding = await db.wedding.findUnique({ where: { id }, select: { partner1: true, partner2: true, city: true } });
  if (!wedding) notFound();
  const bookings = await db.booking.findMany({
    where: { weddingId: id },
    orderBy: [{ expectedArrival: "asc" }, { id: "asc" }],
    select: { id: true, checkinToken: true, expectedArrival: true, vendor: { select: { name: true, category: true } } },
  });
  const passes = bookings.map((b) => ({
    id: b.id,
    token: b.checkinToken,
    vendorName: b.vendor.name,
    category: b.vendor.category.replaceAll("_", " "),
    expectedArrival: b.expectedArrival ? b.expectedArrival.toISOString() : null,
  }));
  return (
    <>
      <PageHeader
        title="Vendor QR passes"
        subtitle={`${wedding.partner1} & ${wedding.partner2} · ${wedding.city}`}
        back={{ href: `/weddings/${id}/live`, label: "Control room" }}
      />
      <QrPassSheet passes={passes} />
    </>
  );
}
