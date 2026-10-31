import { requirePageUser } from "@/lib/auth";
import { VendorDirectory } from "@/components/vendors/VendorDirectory";

export const metadata = { title: "Vendors" };

export default async function Page() {
  await requirePageUser();
  return <VendorDirectory />;
}
