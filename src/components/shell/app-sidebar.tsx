"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarHeart, Inbox, LayoutDashboard, LogOut, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, founderOnly: true },
  { href: "/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/weddings", label: "Weddings", icon: CalendarHeart },
  { href: "/vendors", label: "Vendors", icon: Store },
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
        <div className="grid size-9 place-items-center rounded-full bg-marigold text-maroon">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="9" cy="12" r="5" />
            <circle cx="15" cy="12" r="5" />
          </svg>
        </div>
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
              <n.icon className="size-4" />
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
        <button onClick={logout} className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}
