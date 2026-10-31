"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Dialogs and drawers portal to <body>, outside the shell — scope the staff font on <html> too.
  useEffect(() => {
    document.documentElement.classList.add("app-ui");
    return () => document.documentElement.classList.remove("app-ui");
  }, []);
  return (
    <TooltipProvider delayDuration={200}>
    <div className="app-ui flex min-h-svh">
      <aside className={`sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 ease-out md:block ${rail ? "w-16" : "w-56"}`}>
        <AppSidebar user={user} rail={rail} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-brand text-lg font-semibold">The Royal Knot</span>
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-60 border-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar user={user} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  );
}
