import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Season overview — profit, cash flow and vendor performance" />
      <EmptyState icon={Construction} title="Coming up next" hint="This screen is being built." />
    </>
  );
}
