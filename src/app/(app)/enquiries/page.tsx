import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Enquiries" };

export default function Page() {
  return (
    <>
      <PageHeader title="Enquiries" subtitle="Every couple who got in touch, in one pipeline" />
      <EmptyState icon={Construction} title="Coming up next" hint="This screen is being built." />
    </>
  );
}
