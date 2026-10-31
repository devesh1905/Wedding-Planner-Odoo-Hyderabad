"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/icon";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { KnotMark } from "@/components/home/knot-mark";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV: { href: string; label: string; icon: IconName; founderOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "chart", founderOnly: true },
  { href: "/enquiries", label: "Enquiries", icon: "inbox" },
  { href: "/weddings", label: "Weddings", icon: "heart" },
  { href: "/vendors", label: "Vendors", icon: "shop" },
];

/**
 * Thin icon rail by default (labels in tooltips), expandable to show labels. `rail` = collapsed.
 * The mobile drawer always renders it expanded.
 */
export function AppSidebar({
  user,
  rail = false,
  onToggle,
  onNavigate,
}: {
  user: { name: string; role: string };
  rail?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  // In the rail every control is an icon; the tooltip carries its name.
  const Tip = ({ label, children }: { label: string; children: React.ReactElement }) =>
    rail ? (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    ) : (
      children
    );

  const item = "flex h-9 items-center gap-3 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  return (
    <div className={cn("flex h-full flex-col border-r bg-background py-3", rail ? "items-center px-2" : "px-3")}>
      <Link href="/" className={cn("mb-4 flex h-10 items-center gap-2.5", rail ? "justify-center" : "px-2")} aria-label="The Royal Knot home">
        <KnotMark className="h-5 w-10 shrink-0 text-foreground" effects={false} />
        {!rail && <span className="font-brand text-base">The Royal Knot</span>}
      </Link>

      <nav className={cn("flex flex-1 flex-col gap-1", rail ? "items-center" : "")} aria-label="Main">
        {NAV.filter((n) => !n.founderOnly || user.role === "FOUNDER").map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Tip key={n.href} label={n.label}>
              <Link
                href={n.href}
                onClick={onNavigate}
                aria-label={rail ? n.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  item,
                  rail ? "w-9 justify-center" : "px-2.5",
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon name={n.icon} className={cn("size-[18px]", active && "text-cta")} />
                {!rail && n.label}
              </Link>
            </Tip>
          );
        })}
      </nav>

      <div className={cn("flex flex-col gap-1 border-t pt-3", rail ? "items-center" : "")}>
        {onToggle && (
          <Tip label="Expand (Ctrl B)">
            <button
              type="button"
              onClick={onToggle}
              aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(item, rail ? "w-9 justify-center" : "px-2.5", "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                <path d="M9.5 4.5v15" />
                <path d={rail ? "m13.5 10 2 2-2 2" : "m15.5 10-2 2 2 2"} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!rail && "Collapse"}
            </button>
          </Tip>
        )}
        <Tip label="Theme">
          <span className={cn("flex items-center gap-1 text-sm text-muted-foreground", !rail && "px-0.5")}>
            <ThemeToggle className="size-9 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground" />
            {!rail && "Theme"}
          </span>
        </Tip>
        <Tip label="Sign out">
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className={cn(item, rail ? "w-9 justify-center" : "px-2.5", "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
          >
            <Icon name="logout" className="size-[18px]" />
            {!rail && "Sign out"}
          </button>
        </Tip>
        <Tip label={`${user.name} · ${user.role.toLowerCase()}`}>
          <div className={cn("mt-1 flex items-center gap-2.5", !rail && "px-1.5")}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cta text-xs font-semibold text-cta-foreground">{initials(user.name)}</span>
            {!rail && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</span>
              </span>
            )}
          </div>
        </Tip>
      </div>
    </div>
  );
}
