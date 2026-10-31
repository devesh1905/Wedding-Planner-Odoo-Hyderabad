import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Vendors" };

export default function Page() {
  return (
    <>
      <PageHeader title="Vendors" subtitle="Decorators, caterers, DJs and everyone we hire" />
      <EmptyState icon={Construction} title="Coming up next" hint="This screen is being built." />
    </>
  );
}
