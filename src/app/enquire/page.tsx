import Link from "next/link";
import type { Metadata } from "next";
import { EnquireForm } from "./enquire-form";
import { KnotMark } from "@/components/home/knot-mark";

export const metadata: Metadata = { title: { absolute: "Plan your wedding · The Royal Knot" } };

export default function EnquirePage() {
  return (
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8 space-y-3 text-center">
          <Link href="/" aria-label="The Royal Knot — home" className="mx-auto block w-fit text-maroon transition-transform hover:scale-105">
            <KnotMark className="h-10 w-20" />
          </Link>
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
