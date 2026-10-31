"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/icon";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { KnotMark } from "@/components/home/knot-mark";
import { ThemeToggle } from "@/components/common/theme-toggle";

const NAV: { href: string; label: string; icon: IconName; founderOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "chart", founderOnly: true },
  { href: "/enquiries", label: "Enquiries", icon: "inbox" },
  { href: "/weddings", label: "Weddings", icon: "heart" },
  { href: "/vendors", label: "Vendors", icon: "shop" },
];

export function AppSidebar({ user, onNavigate }: { user: { name: string; role: string }; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-6">
        <KnotMark className="h-6 w-12 shrink-0 text-[oklch(0.93_0.03_80)]" />
        <div className="leading-tight">
          <p className="font-serif text-xl font-semibold">The Royal Knot</p>
          <p className="text-[11px] tracking-widest text-sidebar-foreground/60 uppercase">KnotOS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((n) => !n.founderOnly || user.role === "FOUNDER").map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--marigold)]"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon name={n.icon} className="size-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-3">
        <div className="grid size-9 place-items-center rounded-full bg-marigold text-sm font-semibold text-maroon">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <ThemeToggle className="size-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        <button onClick={logout} className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Sign out">
          <Icon name="logout" className="size-4" />
        </button>
      </div>
    </div>
  );
}
