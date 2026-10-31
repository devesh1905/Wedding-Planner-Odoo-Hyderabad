import { Reveal, RevealItem } from "./reveal";

// One picture per day of a three-day wedding. Days 1–2 are illustrative (generated, labelled as
// such); day 3 is a real photograph of City Palace, Udaipur, credited under its CC BY-SA 4.0 licence.
const DAYS = [
  {
    day: "Day 1",
    title: "Mehendi",
    src: "/brand/wedding-mehendi",
    sizes: [480, 800],
    alt: "A bride's hennaed hands cupping a lit brass diya",
    credit: <>Illustrative image</>,
  },
  {
    day: "Day 2",
    title: "Baraat & pheras",
    src: "/brand/wedding-baraat",
    sizes: [480, 800],
    alt: "A groom on a white horse arrives at a palace gate with dhol drummers at sunset",
    credit: <>Illustrative image</>,
  },
  {
    day: "Day 3",
    title: "Reception by the lake",
    src: "/brand/city-palace-udaipur-night",
    sizes: [960, 1600],
    alt: "City Palace, Udaipur, lit gold at night and reflected in Lake Pichola",
    credit: (
      <>
        City Palace, Udaipur · Ashwin Geet D&apos;Sa,{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Udaipur_City_Palace_at_Night.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          CC BY-SA 4.0
        </a>
      </>
    ),
  },
];

/** "Three days" — the headline's promise, shown: one moment from each day of the celebration. */
export function ThreeDays() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24" aria-label="Three days">
      <Reveal className="grid gap-5 sm:grid-cols-3">
        {DAYS.map((d) => (
          <RevealItem key={d.day}>
            <figure>
              <div className="squircle group relative overflow-hidden rounded-3xl ring-1 ring-marigold/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${d.src}-${d.sizes[1]}.jpg`}
                  srcSet={`${d.src}-${d.sizes[0]}.jpg ${d.sizes[0]}w, ${d.src}-${d.sizes[1]}.jpg ${d.sizes[1]}w`}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  alt={d.alt}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-5 pt-16 text-white">
                  <p className="text-xs tracking-[0.2em] uppercase opacity-85">{d.day}</p>
                  <p className="font-serif text-2xl">{d.title}</p>
                </div>
              </div>
              <figcaption className="mt-2 text-[11px] text-muted-foreground">{d.credit}</figcaption>
            </figure>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
