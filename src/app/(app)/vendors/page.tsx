import { requirePageUser } from "@/backend/auth";
import { VendorDirectory } from "@/frontend/components/vendors/vendor-directory";

export const metadata = { title: "Vendors" };

export default async function Page() {
  await requirePageUser();
  return <VendorDirectory />;
}
