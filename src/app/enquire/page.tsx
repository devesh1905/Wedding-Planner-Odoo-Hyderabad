import Link from "next/link";
import type { Metadata } from "next";
import { EnquireForm } from "./enquire-form";
import { ViewTransition } from "react";
import { THEMES } from "@/shared/validation/enquiry";
import { KnotMark } from "@/frontend/components/home/knot-mark";

export const metadata: Metadata = { title: { absolute: "Plan your wedding · The Royal Knot" } };

export default async function EnquirePage({ searchParams }: { searchParams: Promise<{ theme?: string | string[] }> }) {
  // /enquire?theme=Royal%20Heritage preselects that theme chip (ignored if it is not a known theme)
  const raw = (await searchParams).theme;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const initialTheme = THEMES.find((t) => t === asked);
  return (
    <ViewTransition enter="page-rise" exit="page-fade" default="none">
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <header className="mb-10 space-y-4 text-center">
          <Link href="/" aria-label="The Royal Knot — home" className="mx-auto block w-fit rounded-lg text-maroon transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <ViewTransition name="brand-mark" share="morph" default="none">
              <KnotMark mode="ignite" className="h-10 w-20" />
            </ViewTransition>
          </Link>
          <h1 className="text-4xl font-semibold text-balance sm:text-5xl">Tell us about your wedding</h1>
          <div className="ornament mx-auto w-32" />
          <p className="text-pretty text-muted-foreground">Share a few details and a planner will call you within 24 hours.</p>
        </header>
        <EnquireForm initialTheme={initialTheme} />
      </div>
    </main>
    </ViewTransition>
  );
}
