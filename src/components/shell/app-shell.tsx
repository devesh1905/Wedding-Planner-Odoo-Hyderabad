"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { Search } from "lucide-react";

export function AppShell({ user, children }: { user: { name: string; role: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Thin icon rail by default; expanded state is remembered. Ctrl/⌘+B toggles.
  const [rail, setRail] = useState(true);
  useEffect(() => {
    try {
      setRail(localStorage.getItem("knot:sidebar") !== "expanded");
    } catch {}
  }, []);
  const toggle = () =>
    setRail((r) => {
      try {
        localStorage.setItem("knot:sidebar", r ? "expanded" : "rail");
      } catch {}
      return !r;
    });
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleTheme = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("knot:theme", dark ? "dark" : "light");
    } catch {}
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
      // Ctrl/⌘ K or "/" (outside a text field) opens search
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("knot:search", openSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("knot:search", openSearch);
    };
  }, []);
  // Dialogs and drawers portal to <body>, outside the shell — scope the staff font on <html> too.
  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  return (
    <TooltipProvider delayDuration={200}>
    <div className="app-ui flex min-h-svh">
      <aside className={`sticky top-0 z-40 hidden h-svh shrink-0 transition-[width] duration-200 ease-out md:block ${rail ? "w-16" : "w-56"}`}>
        <AppSidebar user={user} rail={rail} onToggle={toggle} onSearch={() => setSearchOpen(true)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-brand text-lg font-semibold">The Royal Knot</span>
          <button onClick={() => setSearchOpen(true)} className="ml-auto rounded-md p-2 hover:bg-muted" aria-label="Search">
            <Search className="size-5" />
          </button>
        </header>
        <CommandPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          role={user.role}
          actions={[
            { label: "Switch light / dark", icon: "sun", run: toggleTheme },
            { label: rail ? "Expand sidebar" : "Collapse sidebar", icon: "grid", run: toggle, shortcut: "Ctrl B" },
          ]}
        />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-60 border-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar user={user} onNavigate={() => setOpen(false)} onSearch={() => setSearchOpen(true)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  );
}
