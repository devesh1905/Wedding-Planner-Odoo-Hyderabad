import { db } from "@/lib/db";
import { PageHeader } from "@/components/common/page-header";
import { EnquiryBoard } from "@/components/enquiries/enquiry-board";
import { NewEnquiryDialog } from "@/components/enquiries/new-enquiry-dialog";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const [enquiries, planners] = await Promise.all([
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
        nextFollowUp: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        wedding: { select: { id: true } },
      },
    }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const open = enquiries.filter((e) => e.status !== "SIGNED" && e.status !== "LOST").length;

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle={`${open} open · every couple who got in touch, in one pipeline`}
        actions={<NewEnquiryDialog planners={planners} />}
      />
      <EnquiryBoard enquiries={JSON.parse(JSON.stringify(enquiries))} planners={planners} />
    </>
  );
}
