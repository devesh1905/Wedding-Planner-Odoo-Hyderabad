import type { Metadata } from "next";
import { EnquireForm } from "./enquire-form";

export const metadata: Metadata = { title: "Plan your wedding with us" };

export default function EnquirePage() {
  return (
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8 space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-marigold text-maroon shadow-sm">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="9" cy="12" r="5" />
              <circle cx="15" cy="12" r="5" />
            </svg>
          </div>
          <p className="text-xs tracking-[0.25em] text-maroon uppercase">The Royal Knot · Jaipur & Udaipur</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Tell us about your wedding</h1>
          <div className="ornament mx-auto w-32" />
          <p className="text-muted-foreground">Share a few details and a planner will call you within 24 hours.</p>
        </header>
        <EnquireForm />
      </div>
    </main>
  );
}
