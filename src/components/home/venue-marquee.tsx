const VENUES = [
  "City Palace Udaipur",
  "Rambagh Palace",
  "Samode Palace",
  "The Leela Palace Udaipur",
  "Suryagarh Jaisalmer",
  "Taj Lake Palace",
  "Fairmont Jaipur",
  "Raffles Udaipur",
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {VENUES.map((v) => (
        <li key={v} className="flex items-center">
          <span className="font-serif text-2xl whitespace-nowrap text-foreground/80 sm:text-3xl">{v}</span>
          <span aria-hidden className="mx-8 size-1.5 rotate-45 bg-marigold sm:mx-10" />
        </li>
      ))}
    </ul>
  );
}

/** Slow, endless row of venue names. Two identical rows scroll by exactly one row-width for a seamless loop. */
export function VenueMarquee() {
  return (
    <section className="py-16" aria-label="Venues we have celebrated at">
      <p className="text-center text-xs tracking-[0.3em] text-eyebrow uppercase">Where we&apos;ve celebrated</p>
      <div className="venue-marquee mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="venue-marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
