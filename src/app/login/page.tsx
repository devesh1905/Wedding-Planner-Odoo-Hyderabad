import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { KnotMark } from "@/frontend/components/home/knot-mark";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[oklch(0.13_0.025_18)] text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(600px_300px_at_20%_10%,var(--marigold),transparent_70%),radial-gradient(500px_400px_at_90%_90%,var(--rose),transparent_70%)]" />
        <span />
        <div className="relative max-w-md space-y-4">
          {/* live-flame knot in ivory, the KnotOS wordmark beneath it */}
          <div className="mb-4 flex flex-col items-start gap-3" aria-label="KnotOS">
            <KnotMark mode="ignite" className="h-24 w-48 text-[oklch(0.93_0.03_80)]" />
            <span className="font-brand text-5xl text-[oklch(0.93_0.03_80)]">KnotOS</span>
          </div>
          <p className="pt-2 text-2xl leading-snug font-light tracking-tight text-[oklch(0.93_0.03_80/0.72)]">Every wedding, one calm place.</p>
          <div className="ornament w-40" />
          <p className="text-sidebar-foreground/80">
            Enquiries, vendors, plans, the big day and every rupee — from the first call to the final vendor payment.
          </p>
        </div>
        <p className="relative text-sm text-sidebar-foreground/70">Jaipur · Udaipur</p>
      </section>

      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center lg:text-left">
            <div className="mx-auto mb-4 w-fit lg:hidden">
              <Logo />
            </div>
            <h1 className="text-4xl font-semibold">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to KnotOS</p>
          </div>
          <LoginForm next={typeof next === "string" ? next : undefined} />
          <p className="squircle rounded-xl border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Demo: <b className="font-semibold text-foreground">founder@royalknot.in</b> or <b className="font-semibold text-foreground">ananya@royalknot.in</b>{" "}
            · password <b className="font-semibold text-foreground">knot@2026</b>
          </p>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return <KnotMark className="h-9 w-[4.4rem] text-maroon" />;
}
