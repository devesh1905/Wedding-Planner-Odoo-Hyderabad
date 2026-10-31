import { AppShell } from "@/components/shell/app-shell";
import { requirePageUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
