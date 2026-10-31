import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { getSession } from "@/lib/auth";
import { ViewTransition } from "react";
import { Splash } from "@/components/home/splash";
import { Hero } from "@/components/home/hero";
import { Chapters } from "@/components/home/chapters";
import { Celebrations } from "@/components/home/celebrations";
import { VenueMarquee } from "@/components/home/venue-marquee";
import { NumberTicker } from "@/components/home/number-ticker";
import { Magnetic } from "@/components/home/magnetic";
import { MonogramButton } from "@/components/home/monogram-button";
import { Reveal, RevealItem } from "@/components/home/reveal";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { CaveMode, DiyaSlot } from "@/components/cave/cave-mode";

export const metadata: Metadata = {
  title: { absolute: "The Royal Knot — Luxury weddings in Jaipur & Udaipur" },
  description: "Three-day luxury weddings, planned with calm and clarity. Tell us about yours.",
};

const PROMISES = [
  { icon: "guests", k: "25", from: 0, v: "weddings a season, never more", d: "So every couple has a lead planner who knows every detail." },
  { icon: "phone", k: "1 day", from: 0, v: "to hear back from us", d: "Every enquiry has an owner the moment it arrives." },
  { icon: "billCheck", k: "0", from: 9, v: "surprises on the final bill", d: "Every addition is shown to you, priced fairly, before it's billed." },
] as const;

// The couples' front door. Staff who are signed in get a quiet link back into KnotOS.
export default async function Home() {
  const session = await getSession();

  return (
    <div className="bg-background">
      <Splash />
      <CaveMode />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <MonogramButton />
          <nav className="flex items-center gap-6 text-sm">
            <a href="#journey" className="hidden items-center gap-1.5 text-foreground/70 hover:text-foreground sm:inline-flex">
              <Icon name="route" />How it works
            </a>
            <a href="#celebrations" className="hidden items-center gap-1.5 text-foreground/70 hover:text-foreground sm:inline-flex">
              <Icon name="confetti" />Celebrations
            </a>
            <ThemeToggle className="-my-2" />
            <Link
              href={session ? (session.role === "FOUNDER" ? "/dashboard" : "/weddings") : "/login"}
              className="inline-flex items-center gap-1.5 text-foreground/50 hover:text-foreground"
            >
              <Icon name={session ? "grid" : "login"} />
              {session ? "Open KnotOS" : "Team sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <ViewTransition enter="page-rise" exit="page-fade" default="none">
      <main>
        <Hero />

        <section className="relative mx-auto max-w-6xl px-6 py-24" aria-label="Our promise">
          <DiyaSlot id="promise" className="absolute top-6 right-6" />
          <Reveal className="grid gap-12 border-t border-border pt-12 md:grid-cols-3">
            {PROMISES.map((p) => (
              <RevealItem key={p.v}>
                <div data-cast>
                <p className="font-serif text-6xl font-semibold text-eyebrow"><NumberTicker value={p.k} from={p.from} />
                </p>
                <p className="mt-2 flex items-center gap-2 text-lg font-medium"><Icon name={p.icon} className="size-5 text-eyebrow" />{p.v}</p>
                <p className="mt-2 leading-relaxed text-muted-foreground">{p.d}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </section>

        <Chapters />
        <VenueMarquee />
        <Celebrations />

        <section className="px-6 pb-24">
          <Reveal className="squircle relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-[oklch(0.24_0.07_18)] px-8 py-20 text-center text-[oklch(0.95_0.02_80)] sm:px-16">
            <div className="aurora aurora-dim pointer-events-none absolute inset-0" aria-hidden>
              <span className="aurora-a" />
              <span className="aurora-b" />
            </div>
            <DiyaSlot id="cta" className="absolute top-8 right-8" />
            <RevealItem className="relative">
              <p className="text-xs tracking-[0.35em] text-marigold uppercase">Begin</p>
              <h2 data-cast className="mx-auto mt-4 max-w-2xl text-5xl leading-tight font-semibold sm:text-6xl">Tell us the date you're dreaming of</h2>
              <p className="mx-auto mt-5 max-w-lg text-[oklch(0.95_0.02_80/0.75)]">Two minutes to share it. One day to hear from your planner.</p>
            </RevealItem>
            <RevealItem className="relative mt-10">
              <Magnetic>
                <Link
                  href="/enquire"
                  className="group inline-flex items-center gap-3 rounded-full bg-marigold px-8 py-4 text-base font-medium text-[oklch(0.22_0.05_30)] transition-colors hover:bg-[oklch(0.8_0.15_75)]"
                >
                  Start your enquiry
                  <Icon name="arrow" className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
            </RevealItem>
          </Reveal>
        </section>
      </main>
      </ViewTransition>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Royal Knot · Jaipur · Udaipur</p>
          <p>Planned with care, run on KnotOS.</p>
        </div>
      </footer>
    </div>
  );
}
