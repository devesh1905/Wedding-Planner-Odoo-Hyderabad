import { AppShell } from "@/frontend/components/shell/app-shell";
import { requirePageUser } from "@/backend/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
