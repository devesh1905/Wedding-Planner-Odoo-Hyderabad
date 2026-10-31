"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronRight, CornerDownLeft, Search, X } from "lucide-react";
import { Icon, type IconName } from "@/components/icons/icon";
import { statusLabel } from "@/components/common/stage-pill";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Index = {
  weddings: { id: string; code: string; partner1: string; partner2: string; city: string; venue: string | null; phone: string; stage: string; startDate: string }[];
  enquiries: { id: string; partner1: string; partner2: string; phone: string; city: string | null; status: string }[];
  vendors: { id: string; name: string; category: string; city: string; phone: string }[];
};

const PAGES: { label: string; href: string; icon: IconName; founderOnly?: boolean; keywords?: string[] }[] = [
  { label: "Dashboard", href: "/dashboard", icon: "chart", founderOnly: true, keywords: ["profit", "revenue", "season", "kpi"] },
  { label: "Dashboard · Today", href: "/dashboard?period=today", icon: "chart", founderOnly: true },
  { label: "Dashboard · This week", href: "/dashboard?period=week", icon: "chart", founderOnly: true },
  { label: "Dashboard · This month", href: "/dashboard?period=month", icon: "chart", founderOnly: true },
  { label: "Enquiries", href: "/enquiries", icon: "inbox", keywords: ["leads", "pipeline", "kanban"] },
  { label: "Weddings", href: "/weddings", icon: "heart", keywords: ["bookings", "events"] },
  { label: "Vendors", href: "/vendors", icon: "shop", keywords: ["caterer", "decorator", "florist", "photographer", "dj"] },
];

const SECTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "plan", label: "Plan", icon: "checklist" },
  { key: "vendors", label: "Vendors & quotes", icon: "shop" },
  { key: "payments", label: "Payments", icon: "card" },
  { key: "settlement", label: "Settlement", icon: "wallet" },
  { key: "hours", label: "Team hours", icon: "clock" },
];

/** Every typed word must appear (name, phone, code, city…); names that start with it rank first. */
function match(value: string, search: string, keywords?: string[]) {
  const hay = `${value} ${keywords?.join(" ") ?? ""}`.toLowerCase();
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.includes(w))) return 0;
  return hay.startsWith(words[0]!) || hay.includes(` ${words[0]}`) ? 1 : 0.5;
}

const couple = (x: { partner1: string; partner2: string }) => `${x.partner1} & ${x.partner2}`;
const tidy = (s: string) => s.toLowerCase().replace(/_/g, " ");

/**
 * Global search (Ctrl/⌘ K): pages, couples (booked weddings and open enquiries), a wedding's
 * sections, vendors and a few actions. The index loads once per open; cmdk filters as you type.
 */
export function CommandPalette({
  open,
  onOpenChange,
  role,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: string;
  actions: { label: string; icon: IconName; run: () => void; shortcut?: string }[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState<Index | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    fetch("/api/search")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIndex(d))
      .catch(() => {});
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const q = query.trim().toLowerCase();
  // Weddings whose couple name matches get their sections listed, so "dhruv pay" lands on Payments.
  const sectionTargets = useMemo(
    () => (q.length >= 2 && index ? index.weddings.filter((w) => tidy(couple(w)).includes(q.split(" ")[0]!)).slice(0, 2) : []),
    [q, index],
  );
  // With an empty box show a short, useful list; once typing, everything is searchable.
  const weddings = index ? (q ? index.weddings : index.weddings.filter((w) => w.stage === "BIG_DAY" || w.stage === "PLANNING").slice(0, 4)) : [];
  const enquiries = index ? (q ? index.enquiries : index.enquiries.slice(0, 3)) : [];
  const vendors = index && q ? index.vendors : [];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-3xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Search KnotOS</DialogPrimitive.Title>
          <Command loop filter={match} className="flex max-h-[70vh] flex-col">
            <div className="flex items-center gap-3 border-b px-5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search couples, vendors, pages…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <DialogPrimitive.Close className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            <Command.List
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain px-3 py-3",
                // group heading: small dot + uppercase label; items hang off a thin guide line
                "[&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:gap-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase",
                "[&_[cmdk-group-heading]]:before:size-1.5 [&_[cmdk-group-heading]]:before:rounded-full [&_[cmdk-group-heading]]:before:bg-cta [&_[cmdk-group-heading]]:before:content-['']",
                "[&_[cmdk-group-items]]:ml-[11px] [&_[cmdk-group-items]]:space-y-0.5 [&_[cmdk-group-items]]:border-l [&_[cmdk-group-items]]:pl-2",
              )}
            >
              <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
                {index ? `Nothing matches “${query}”.` : "Loading…"}
              </Command.Empty>

              <Command.Group heading="Pages">
                {PAGES.filter((p) => !p.founderOnly || role === "FOUNDER").map((p) => (
                  <Item key={p.href} value={p.label} keywords={p.keywords} icon={p.icon} onSelect={() => go(p.href)} title={p.label} />
                ))}
              </Command.Group>

              {sectionTargets.map((w) => (
                <Command.Group key={`s-${w.id}`} heading={`Jump into ${couple(w)}`}>
                  {SECTIONS.map((s) => (
                    <Item
                      key={s.key}
                      value={`${couple(w)} ${s.label} ${w.code}`}
                      keywords={[w.partner1, w.partner2]}
                      icon={s.icon}
                      onSelect={() => go(`/weddings/${w.id}?tab=${s.key}`)}
                      title={s.label}
                      meta={couple(w)}
                    />
                  ))}
                  {w.stage === "BIG_DAY" && (
                    <Item value={`${couple(w)} control room live`} keywords={[w.partner1, w.partner2]} icon="radar" onSelect={() => go(`/weddings/${w.id}/live`)} title="Control room" meta="Live today" />
                  )}
                </Command.Group>
              ))}

              {weddings.length > 0 && (
                <Command.Group heading={q ? "Weddings" : "Happening now"}>
                  {weddings.map((w) => (
                    <Item
                      key={w.id}
                      value={`${couple(w)} ${w.code} ${w.city} ${w.venue ?? ""} ${w.phone}`}
                      icon="heart"
                      onSelect={() => go(`/weddings/${w.id}`)}
                      title={couple(w)}
                      meta={`${w.code} · ${formatDate(w.startDate)} · ${statusLabel(w.stage)}`}
                    />
                  ))}
                </Command.Group>
              )}

              {enquiries.length > 0 && (
                <Command.Group heading={q ? "Enquiries" : "Latest enquiries"}>
                  {enquiries.map((e) => (
                    <Item
                      key={e.id}
                      value={`${couple(e)} ${e.phone} ${e.city ?? ""} enquiry`}
                      icon="inbox"
                      onSelect={() => go(`/enquiries?open=${e.id}`)}
                      title={couple(e)}
                      meta={`${e.city ?? "City TBC"} · ${tidy(e.status)}`}
                    />
                  ))}
                </Command.Group>
              )}

              {vendors.length > 0 && (
                <Command.Group heading="Vendors">
                  {vendors.map((v) => (
                    <Item
                      key={v.id}
                      value={`${v.name} ${v.category} ${v.city} ${v.phone}`}
                      icon="shop"
                      onSelect={() => go(`/vendors/${v.id}`)}
                      title={v.name}
                      meta={`${tidy(v.category)} · ${v.city}`}
                    />
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Actions">
                {actions.map((a) => (
                  <Item
                    key={a.label}
                    value={a.label}
                    icon={a.icon}
                    title={a.label}
                    meta={a.shortcut}
                    onSelect={() => {
                      onOpenChange(false);
                      a.run();
                    }}
                  />
                ))}
              </Command.Group>
            </Command.List>

            <div className="flex items-center gap-4 border-t px-5 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                Open
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>Esc</Kbd> Close
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Item({
  value,
  keywords,
  icon,
  title,
  meta,
  onSelect,
}: {
  value: string;
  keywords?: string[];
  icon: IconName;
  title: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/85 outline-none data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
    >
      <Icon name={icon} className="size-4 text-muted-foreground group-data-[selected=true]:text-cta" />
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      {meta && <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground capitalize sm:inline">{meta}</span>}
      <ChevronRight className="size-4 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="grid h-5 min-w-5 place-items-center rounded-md border bg-muted px-1 font-sans text-[11px] text-foreground/80">{children}</kbd>;
}
