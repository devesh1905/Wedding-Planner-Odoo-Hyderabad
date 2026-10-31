import { db } from "@/backend/db";
import { PageHeader } from "@/frontend/components/common/page-header";
import { EnquiryBoard } from "@/frontend/components/enquiries/enquiry-board";
import { NewEnquiryDialog } from "@/frontend/components/enquiries/new-enquiry-dialog";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const [enquiries, planners, weddings] = await Promise.all([
    db.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        partner1: true,
        partner2: true,
        phone: true,
        source: true,
        status: true,
        roughDate: true,
        guestCount: true,
        maxBudget: true,
        city: true,
        theme: true,
        services: true,
        nextFollowUp: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        wedding: { select: { id: true } },
      },
    }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.wedding.findMany({ select: { phone: true, partner1: true, partner2: true, enquiryId: true } }),
  ]);

  // Duplicate detection: same mobile (last 10 digits) on another enquiry or an existing wedding.
  const key = (p: string) => p.replace(/\D/g, "").slice(-10);
  const seen = new Map<string, { id: string | null; name: string }[]>();
  const add = (phone: string, id: string | null, name: string) => seen.set(key(phone), [...(seen.get(key(phone)) ?? []), { id, name }]);
  enquiries.forEach((e) => add(e.phone, e.id, `${e.partner1} & ${e.partner2}`));
  weddings.forEach((w) => !enquiries.some((e) => e.id === w.enquiryId) && add(w.phone, null, `${w.partner1} & ${w.partner2} (booked)`));
  const withDupes = enquiries.map((e) => ({ ...e, duplicateOf: seen.get(key(e.phone))?.find((x) => x.id !== e.id)?.name ?? null }));

  const open = enquiries.filter((e) => e.status !== "SIGNED" && e.status !== "LOST").length;

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle={`${open} open · every couple who got in touch, in one pipeline`}
        actions={<NewEnquiryDialog planners={planners} />}
      />
      <EnquiryBoard enquiries={JSON.parse(JSON.stringify(withDupes))} planners={planners} />
    </>
  );
}
