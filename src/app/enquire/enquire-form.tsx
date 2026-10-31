"use client";

import { startTransition, useEffect, useRef, useState, ViewTransition } from "react";
import { useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Icon } from "@/frontend/components/icons/icon";
import { EnquiryFields, emptyEnquiry, toPayload, type EnquiryValues } from "@/frontend/components/enquiries/enquiry-fields";
import {
  EstimateBreakdown,
  EstimateFigure,
  INCLUDED_NOTE,
  PackageBuilder,
  guestNote,
  type PackageSelection,
} from "@/frontend/components/enquiries/package-builder";
import { DEFAULT_GUESTS, DEFAULT_PACKAGE, estimate, EVENT_LABELS, PLANNING, serviceByKey, type EventKey } from "@/shared/package-builder";
import { enquiryInput } from "@/shared/validation/enquiry";
import { formatINRCompact } from "@/shared/format";
import { api, ApiError } from "@/frontend/lib/api-client";
import { cue } from "@/frontend/lib/sound";
import { cn } from "@/shared/utils";
import { petalShower } from "@/frontend/components/home/petals";

const FORM_ID = "enquiry-form";
const PHONE_TEL = "+911412345678";
const PHONE_LABEL = "+91 141 234 5678";
const WHATSAPP = "911412345678";

/** What the server saved (and recomputed) for this enquiry, echoed back by POST /api/public/enquiries. */
type Saved = {
  partner1: string;
  partner2: string;
  roughDate: string | null;
  city: string | null;
  guestCount: number | null;
  theme: string | null;
  planning: string | null;
  events: string[];
  services: string[];
  estimateLow: number | null;
  estimateHigh: number | null;
};
type Sent = { id: string; reference: string; saved: Saved };

const STEPS = [
  { n: 1, label: "Wedding details", short: "Details", target: "step-details" },
  { n: 2, label: "Your package", short: "Package", target: "step-package" },
  { n: 3, label: "Send", short: "Send", target: "step-send" },
] as const;

const planningLabel = (key: string | null | undefined) => PLANNING.find((p) => p.key === key)?.label;

export function EnquireForm({ initialTheme }: { initialTheme?: string }) {
  const [values, setValues] = useState<EnquiryValues>({ ...emptyEnquiry, theme: initialTheme ?? "" });
  const [pkg, setPkg] = useState<PackageSelection>(DEFAULT_PACKAGE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<Sent>();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const sendRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const guests = Number(values.guestCount) || null;
  const est = estimate({ guests, services: pkg.services, events: pkg.events, planning: pkg.planning });

  // Progress header: the section crossing the middle band of the screen is the current step;
  // once the send button is on screen we're on step 3.
  useEffect(() => {
    if (sent) return;
    const details = document.getElementById("step-details");
    const builder = document.getElementById("step-package");
    const send = sendRef.current;
    if (!details || !builder || !send || typeof IntersectionObserver === "undefined") return;
    const seen = { details: false, builder: false, send: false };
    const update = () => setStep((s) => (seen.send ? 3 : seen.builder ? 2 : seen.details ? 1 : s));
    const band = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen[e.target === details ? "details" : "builder"] = e.isIntersecting;
        update();
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const end = new IntersectionObserver(
      ([e]) => {
        seen.send = e.isIntersecting;
        update();
      },
      { threshold: 0.6 },
    );
    band.observe(details);
    band.observe(builder);
    end.observe(send);
    return () => {
      band.disconnect();
      end.disconnect();
    };
  }, [sent]);

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // the server recomputes the estimate from this selection
    const payload = { ...toPayload(values), planning: pkg.planning, events: pkg.events, services: pkg.services };
    // Same schema as the server, so users see errors before the round trip.
    const check = enquiryInput.safeParse(payload);
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [String(i.path[0]), i.message])));
      cue("error");
      // the desktop "Send" lives in the side card, so bring the first problem into view
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#${FORM_ID} [aria-invalid="true"]`)?.focus());
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const res = await api<Sent>("/api/public/enquiries", { method: "POST", body: payload });
      // a transition, so the form card morphs into the thank-you card
      startTransition(() => setSent(res));
      cue("success", "strong");
      petalShower("soft");
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setErrors({ form: err instanceof Error ? err.message : "Could not send" });
    } finally {
      setPending(false);
    }
  }

  if (sent) return <ThankYou sent={sent} />;

  const hasErrors = Object.keys(errors).length > 0;
  const none = pkg.services.length === 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
      <ViewTransition name="enquiry-card" share="morph" default="none">
        <form id={FORM_ID} onSubmit={submit} noValidate className="squircle space-y-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <nav aria-label="Enquiry progress" className="sticky top-2 z-20 -mx-2 rounded-xl border bg-card/95 px-1 shadow-sm backdrop-blur sm:-mx-4">
            <ol className="flex items-center justify-between gap-1">
              {STEPS.map((s, i) => {
                const on = step === s.n;
                return (
                  <li key={s.n} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <Icon name="arrow" className="size-3 shrink-0 text-muted-foreground/60" />}
                    <button
                      type="button"
                      onClick={() => goTo(s.target)}
                      aria-current={on ? "step" : undefined}
                      className={cn(
                        "inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none sm:text-sm",
                        on ? "font-semibold text-maroon" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className={cn("tabular text-[0.7rem] font-semibold", on ? "text-eyebrow" : "")}>0{s.n}</span>
                      <span className="truncate sm:hidden">{s.short}</span>
                      <span className="hidden truncate sm:inline">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section id="step-details" aria-labelledby="details-title" className="scroll-mt-20 space-y-5">
            <header>
              <p id="details-title" className="text-xs font-semibold tracking-[0.2em] text-eyebrow uppercase">
                Step 1 · Wedding details
              </p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">Who&apos;s getting married, where and roughly when.</p>
            </header>
            <EnquiryFields sound values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
          </section>

          <PackageBuilder sound value={pkg} onChange={setPkg} guests={guests} />

          <div id="step-send" ref={sendRef} className="scroll-mt-20 space-y-3">
            {errors.form && <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-sm text-rose">{errors.form}</p>}
            <Button type="submit" size="lg" className="squircle h-12 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {pending && <Loader2 className="animate-spin" />} {pending ? "Sending…" : "Send enquiry"}
            </Button>
          </div>
        </form>
      </ViewTransition>

      {/* Desktop only: a running summary beside the form (phones get the sticky estimate bar instead). */}
      <aside aria-label="Your celebration" className="hidden lg:sticky lg:top-6 lg:block">
        {/* capped to the viewport so the Send button stays reachable when the breakdown is open */}
        <div className="squircle max-h-[calc(100svh-3rem)] space-y-5 overflow-y-auto overscroll-contain rounded-2xl border bg-card p-6 shadow-sm">
          <header>
            <p className="text-xs font-semibold tracking-[0.2em] text-eyebrow uppercase">Summary</p>
            <h2 className="mt-1 text-2xl font-semibold">Your celebration</h2>
          </header>

          <dl className="space-y-2 text-sm">
            {values.theme && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Theme</dt>
                <dd className="text-right font-medium">{values.theme}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="text-right font-medium tabular">{guests ?? <span className="font-normal text-muted-foreground">{DEFAULT_GUESTS} (example)</span>}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Planning</dt>
              <dd className="text-right font-medium">{planningLabel(pkg.planning)}</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Events</p>
            {pkg.events.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {pkg.events.map((ev) => (
                  <li key={ev} className="rounded-full bg-maroon-soft px-2.5 py-1 text-xs font-medium text-maroon">
                    {EVENT_LABELS[ev]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None picked yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Services</p>
            {none ? (
              <p className="text-sm text-muted-foreground">None picked yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {est.lines
                  .filter((l) => l.key !== "fee")
                  .map((l) => (
                    <li key={l.key} className="flex items-center gap-2">
                      <Icon name="check" className="size-3.5 shrink-0 text-teal" />
                      {l.label}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="border-t pt-4">
            <div role="status" aria-live="polite">
              <p className="text-xs font-semibold tracking-[0.15em] text-eyebrow uppercase">Indicative estimate</p>
              <EstimateFigure est={est} none={none} />
            </div>
            {!none && (
              <>
                <EstimateBreakdown est={est} />
                <p className="mt-1 text-xs text-pretty text-muted-foreground">{INCLUDED_NOTE}</p>
              </>
            )}
          </div>

          {hasErrors && !errors.form && <p className="text-sm text-rose">Please check the highlighted fields.</p>}
          <Button type="submit" form={FORM_ID} size="lg" className="squircle h-12 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="animate-spin" />} {pending ? "Sending…" : "Send enquiry"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">An estimate, not a quote — your planner confirms after the first call.</p>
        </div>
      </aside>
    </div>
  );
}

function ThankYou({ sent }: { sent: Sent }) {
  const { reference, saved: s } = sent;
  const date = s.roughDate
    ? new Date(s.roughDate).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    : null;
  const whatsappText = `Hi! I just sent a wedding enquiry to The Royal Knot. My reference is ${reference}.`;
  const rows: [string, React.ReactNode][] = [
    ["Couple", `${s.partner1} & ${s.partner2}`],
    ["Date", date ?? "Not decided yet"],
    ["City", s.city ?? "Not decided yet"],
    ["Guests", s.guestCount ?? `Not given yet (${DEFAULT_GUESTS} used as an example)`],
    ["Theme", s.theme ?? "Open to ideas"],
    ["Planning", planningLabel(s.planning) ?? "To discuss"],
    ["Events", s.events.length ? s.events.map((e) => EVENT_LABELS[e as EventKey] ?? e).join(", ") : "To discuss"],
    ["Services", s.services.length ? s.services.map((k) => serviceByKey(k)?.label ?? k).join(", ") : "To discuss"],
  ];
  const linkCls =
    "squircle inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

  return (
    <div className="mx-auto max-w-2xl">
      <ViewTransition name="enquiry-card" share="morph" default="none">
        <div role="status" className="squircle rounded-2xl border bg-card px-5 py-10 shadow-sm sm:px-10">
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-10 text-teal" aria-hidden />
            <h2 className="mt-4 text-3xl font-semibold text-balance">Thank you, {s.partner1}!</h2>
            <p className="mt-2 text-pretty text-muted-foreground">Your enquiry is with our planning team.</p>
            <div className="ornament mx-auto mt-8 w-24" />
            <p className="mt-6 text-xs tracking-[0.2em] text-muted-foreground uppercase">Your reference</p>
            <p className="mt-1 text-lg font-semibold tracking-wide tabular">{reference}</p>
          </div>

          <h3 className="mt-8 text-sm font-semibold">What you sent us</h3>
          <dl className="mt-2 divide-y divide-border rounded-xl border px-4 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="shrink-0 text-muted-foreground">{k}</dt>
                <dd className="font-medium text-pretty sm:text-right">{v}</dd>
              </div>
            ))}
            {s.estimateLow != null && s.estimateHigh != null && (
              <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="shrink-0 text-muted-foreground">Indicative estimate</dt>
                <dd className="sm:text-right">
                  <span className="font-semibold tabular">
                    {formatINRCompact(s.estimateLow)} – {formatINRCompact(s.estimateHigh)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.guestCount ? guestNote({ guests: s.guestCount, assumedGuests: false }) : `for ${DEFAULT_GUESTS} guests (example)`} · excludes GST
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 rounded-xl bg-muted px-4 py-3">
            <p className="text-sm font-semibold">What happens next</p>
            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">Your planner will call within one day to talk it through and book a first meeting.</p>
          </div>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <a href={`tel:${PHONE_TEL}`} className={linkCls} aria-label={`Call us on ${PHONE_LABEL}`}>
              <Icon name="phone" className="size-4" /> Call us
            </a>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkCls}
            >
              <Icon name="chat" className="size-4" /> WhatsApp
            </a>
            <a
              href={`/api/public/enquiries/${sent.id}/summary?ref=${reference}`}
              download
              className={cn(linkCls, "border-transparent bg-primary text-primary-foreground hover:bg-primary/85 sm:col-span-2")}
            >
              <Icon name="doc" className="size-4" /> Download summary (PDF)
            </a>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">The summary link works for 24 hours.</p>
        </div>
      </ViewTransition>
    </div>
  );
}
