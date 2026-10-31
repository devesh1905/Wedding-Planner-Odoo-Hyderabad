import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/frontend/components/icons/icon";
import { getSession } from "@/backend/auth";
import { ViewTransition } from "react";
import { Splash } from "@/frontend/components/home/splash";
import { Hero } from "@/frontend/components/home/hero";
import { Chapters } from "@/frontend/components/home/chapters";
import { ThreeDays } from "@/frontend/components/home/three-days";
import { Team, type TeamMember } from "@/frontend/components/home/team";
import { db } from "@/backend/db";
import { Celebrations } from "@/frontend/components/home/celebrations";
import { VenueMarquee } from "@/frontend/components/home/venue-marquee";
import { NumberTicker } from "@/frontend/components/home/number-ticker";
import { Magnetic } from "@/frontend/components/home/magnetic";
import { MonogramButton } from "@/frontend/components/home/monogram-button";
import { Reveal, RevealItem } from "@/frontend/components/home/reveal";
import { ThemeToggle } from "@/frontend/components/common/theme-toggle";
import { CaveMode, DiyaSlot } from "@/frontend/components/cave/cave-mode";

export const metadata: Metadata = {
  title: { absolute: "The Royal Knot — Luxury weddings in Jaipur & Udaipur" },
  description: "Three-day luxury weddings, planned with calm and clarity. Tell us about yours.",
};

const PROMISES = [
  { k: "25", from: 0, v: "weddings a season, never more" },
  { k: "1 day", from: 0, v: "to hear back from us" },
  { k: "0", from: 9, v: "surprises on the final bill" },
];

// The couples' front door. Staff who are signed in get a quiet link back into KnotOS.
export default async function Home() {
  const session = await getSession();
  // the team section reads live counts from the planning system
  const staff = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, avatarColor: true, leadWeddings: { where: { stage: { not: "CANCELLED" } }, select: { stage: true } } },
  });
  const team: TeamMember[] = staff.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    color: u.avatarColor,
    leading: u.leadWeddings.filter((w) => w.stage !== "SETTLED").length,
    done: u.leadWeddings.filter((w) => w.stage === "SETTLED").length,
  }));
  if (team[0]?.role === "FOUNDER") {
    // the founder oversees every wedding rather than leading one
    const all = await db.wedding.groupBy({ by: ["stage"], where: { stage: { not: "CANCELLED" } }, _count: true });
    team[0].leading = all.filter((g) => g.stage !== "SETTLED").reduce((n, g) => n + g._count, 0);
    team[0].done = all.filter((g) => g.stage === "SETTLED").reduce((n, g) => n + g._count, 0);
  }

  return (
    <div className="bg-background">
      <Splash />
      <CaveMode />

      <header className="home-header fixed inset-x-0 top-0 z-50 border-b border-transparent bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:gap-4 sm:px-6 sm:py-5">
          <MonogramButton />
          <nav className="flex items-center gap-3 text-sm sm:gap-6">
            <a href="#journey" className="hit-44 hidden items-center gap-1.5 whitespace-nowrap text-foreground/85 hover:text-foreground lg:inline-flex">
              <Icon name="route" />How it works
            </a>
            <a href="#celebrations" className="hit-44 hidden items-center gap-1.5 whitespace-nowrap text-foreground/85 hover:text-foreground lg:inline-flex">
              <Icon name="confetti" />Celebrations
            </a>
            <ThemeToggle className="-my-2" />
            <Link
              href={session ? (session.role === "FOUNDER" ? "/dashboard" : "/weddings") : "/login"}
              aria-label={session ? "Open KnotOS" : "Team sign in"}
              className="hit-44 inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
            >
              <Icon name={session ? "grid" : "login"} className="size-5 sm:size-4" />
              {/* icon only on phones so the header stays one line */}
              <span className="hidden sm:inline">{session ? "Open KnotOS" : "Team sign in"}</span>
            </Link>
            {/* the one action couples come for, always in reach */}
            <Link
              href="/enquire"
              className="hit-44 hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-cta px-4 py-2 text-sm font-medium text-cta-foreground transition-colors hover:bg-cta/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex"
            >
              Plan your wedding
            </Link>
          </nav>
        </div>
      </header>

      <ViewTransition enter="page-rise" exit="page-fade" default="none">
      <main data-snap-page>
        <Hero />

        <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-24" aria-label="Our promise">
          <DiyaSlot id="promise" className="absolute top-6 right-6" />
          <Reveal className="grid gap-12 border-t border-border pt-10 md:grid-cols-3">
            {PROMISES.map((p) => (
              <RevealItem key={p.v}>
                <div data-cast>
                <p className="font-serif text-6xl font-semibold text-eyebrow"><NumberTicker value={p.k} from={p.from} />
                </p>
                <p className="mt-2 text-lg font-medium">{p.v}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </section>

        <ThreeDays />
        <Chapters />
        <VenueMarquee />
        <Celebrations />
        <Team people={team} />

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
                  className="group inline-flex items-center gap-3 rounded-full bg-marigold px-6 py-4 text-base font-medium whitespace-nowrap sm:px-8 text-[oklch(0.22_0.05_30)] transition-colors hover:bg-[oklch(0.8_0.15_75)]"
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
