import { requirePageUser } from "@/backend/auth";
import { VendorDirectory } from "@/frontend/components/vendors/VendorDirectory";

export const metadata = { title: "Vendors" };

export default async function Page() {
  await requirePageUser();
  return <VendorDirectory />;
}
