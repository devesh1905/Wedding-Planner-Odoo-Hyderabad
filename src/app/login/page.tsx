import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { KnotMark } from "@/components/home/knot-mark";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[oklch(0.13_0.025_18)] text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_300px_at_20%_10%,var(--marigold),transparent_70%),radial-gradient(500px_400px_at_90%_90%,var(--rose),transparent_70%)]" />
        <div className="relative flex items-center gap-3">
          <KnotMark className="h-7 w-14 text-[oklch(0.93_0.03_80)]" />
          <span className="font-serif text-2xl font-semibold">KnotOS</span>
          <span className="text-sm text-sidebar-foreground/60">for The Royal Knot</span>
        </div>
        <div className="relative max-w-md space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/knotos-glow.png" alt="KnotOS" className="-ml-8 mb-2 w-80" />
          <p className="font-serif text-5xl leading-tight font-semibold">Every wedding, one calm place.</p>
          <div className="ornament w-40" />
          <p className="text-sidebar-foreground/80">
            Enquiries, vendors, plans, the big day and every rupee — from the first call to the final vendor payment.
          </p>
        </div>
        <p className="relative text-sm text-sidebar-foreground/60">Jaipur · Udaipur</p>
      </section>

      <section className="flex items-center justify-center bg-paper p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="mx-auto w-fit lg:hidden">
              <Logo />
            </div>
            <h1 className="text-4xl font-semibold">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to KnotOS</p>
          </div>
          <LoginForm next={typeof next === "string" ? next : undefined} />
          <p className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
            Demo: <b>founder@royalknot.in</b> or <b>ananya@royalknot.in</b> · password <b>knot@2026</b>
          </p>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return <KnotMark className="h-9 w-[4.4rem] text-maroon" />;
}
