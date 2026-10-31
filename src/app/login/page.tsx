import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(600px_300px_at_20%_10%,var(--marigold),transparent_70%),radial-gradient(500px_400px_at_90%_90%,var(--rose),transparent_70%)]" />
        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="font-serif text-2xl font-semibold">The Royal Knot</span>
        </div>
        <div className="relative max-w-md space-y-4">
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
  return (
    <div className="grid size-10 place-items-center rounded-full bg-marigold text-maroon shadow-sm">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
      </svg>
    </div>
  );
}
