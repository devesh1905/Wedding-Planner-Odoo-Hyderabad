import { Reveal, RevealItem } from "./reveal";
import { initials } from "@/shared/format";
import { cn } from "@/shared/utils";

export type TeamMember = { id: string; name: string; role: "FOUNDER" | "PLANNER"; color: string | null; leading: number; done: number };

const TONE: Record<string, string> = {
  maroon: "bg-cta text-cta-foreground",
  marigold: "bg-marigold text-[oklch(0.25_0.05_40)]",
  teal: "bg-teal text-white",
  rose: "bg-rose text-white",
};

/**
 * "The people behind your day": the founder and lead planners, with how many weddings each is
 * carrying — counted live from the planning system, not written by hand. No invented
 * testimonials; initials instead of stock portraits.
 */
export function Team({ people }: { people: TeamMember[] }) {
  if (!people.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="team-title">
      <p className="text-xs tracking-[0.3em] text-eyebrow uppercase">Your team</p>
      <h2 id="team-title" data-cast className="mt-3 max-w-xl text-4xl leading-tight font-semibold sm:text-5xl">
        The people behind your day
      </h2>
      <p className="mt-4 max-w-xl text-muted-foreground">Every wedding has one lead planner from the first call to the final payment — never a hand-off.</p>
      <Reveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((p) => (
          <RevealItem key={p.id}>
            <div data-cast className="squircle h-full rounded-3xl border bg-surface p-6">
              <span className={cn("grid size-14 place-items-center rounded-full font-serif text-xl", TONE[p.color ?? ""] ?? "bg-muted")}>
                {initials(p.name)}
              </span>
              <p className="mt-4 font-serif text-2xl">{p.name}</p>
              <p className="text-sm text-muted-foreground">{p.role === "FOUNDER" ? "Founder · signs off every plan" : "Lead planner"}</p>
              <p className="mt-4 border-t pt-4 text-sm">
                {p.role === "FOUNDER" ? (
                  <>
                    Oversees all <span className="font-semibold tabular-nums">{p.leading + p.done}</span> weddings on our books
                  </>
                ) : (
                  <>
                    Leading <span className="font-semibold tabular-nums">{p.leading}</span> weddings now
                    {p.done > 0 && (
                      <>
                        {" "}
                        · <span className="font-semibold tabular-nums">{p.done}</span> delivered
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
