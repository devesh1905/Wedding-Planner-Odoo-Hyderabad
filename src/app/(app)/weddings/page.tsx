import { Construction } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Weddings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Weddings" subtitle="All weddings this season, from booking to settlement" />
      <EmptyState icon={Construction} title="Coming up next" hint="This screen is being built." />
    </>
  );
}
