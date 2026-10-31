import { ViewTransition } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarHeart, MapPin, MessageCircle, Phone } from "lucide-react";
import { Icon } from "@/components/icons/icon";
import { db } from "@/lib/db";
import { formatDate, formatINR, relativeDays } from "@/lib/format";
import { extraClientCharge } from "@/lib/settlement";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ApproveAddons } from "./approve-addons";
import { SoundToggle } from "./sound-toggle";
import { Reveal, RevealItem } from "@/components/home/reveal";
import { FlipCountdown } from "@/components/portal/flip-countdown";
import { CheckDraw } from "@/components/portal/check-draw";

export const metadata: Metadata = { title: { absolute: "Your wedding · The Royal Knot" }, robots: { index: false } };

// Couple portal: private link, no login. Shows progress, payment schedule and add-ons to approve.
export default async function CouplePortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const w = await db.wedding.findUnique({
    where: { portalToken: token },
    include: {
      leadPlanner: { select: { name: true, email: true } },
      tasks: { select: { stage: true, event: true } },
      milestones: { orderBy: { dueDate: "asc" }, include: { extras: { select: { id: true, description: true, qty: true, unitPrice: true, clientUnitPrice: true, billableToClient: true, milestoneId: true, clientApproved: true } } } },
      events: { orderBy: { startsAt: "asc" }, select: { id: true, name: true, startsAt: true, venue: true } },
      enquiry: { select: { agreement: { select: { token: true, status: true } } } },
    },
  });
  if (!w) notFound();

  const done = w.tasks.filter((t) => t.stage === "DONE").length;
  const pct = w.tasks.length ? Math.round((done / w.tasks.length) * 100) : 0;
  const days = Math.ceil((w.startDate.getTime() - Date.now()) / 86_400_000);
  const pendingAddons = w.milestones.filter((m) => m.type === "ADDON" && m.status === "DUE" && m.extras.some((e) => !e.clientApproved));
  const agreement = w.enquiry?.agreement;

  return (
    <ViewTransition enter="page-rise" exit="page-fade" default="none">
    <main className="min-h-svh bg-paper">
      <Reveal className="mx-auto max-w-xl space-y-6 px-6 pt-6 pb-16 sm:pt-10">
        <header className="space-y-4 text-center">
          <div className="flex justify-end">
            <SoundToggle />
          </div>
          <p className="text-xs tracking-[0.25em] text-eyebrow uppercase">The Royal Knot</p>
          <h1 className="text-4xl leading-tight font-semibold text-balance break-words sm:text-5xl">
            {w.partner1} & {w.partner2}
          </h1>
          <div className="ornament mx-auto w-32" />
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden /> {w.venue ? `${w.venue}, ` : ""}
            {w.city}
          </p>
        </header>

        <RevealItem><section className="squircle rounded-3xl bg-cta px-6 py-8 text-center text-cta-foreground shadow-lg">
          {days > 0 ? (
            <>
              <p><FlipCountdown days={days} /></p>
              <p className="mt-1 text-sm opacity-85">days to go · {formatDate(w.startDate)}</p>
            </>
          ) : days > -3 ? (
            <p className="font-serif text-3xl font-semibold">It's your wedding week!</p>
          ) : (
            <p className="font-serif text-3xl font-semibold">Married {relativeDays(w.startDate)}</p>
          )}
        </section></RevealItem>

        {pendingAddons.length > 0 && (
          <RevealItem><section className="squircle rounded-2xl border-2 border-marigold bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Icon name="billCheck" className="size-6 shrink-0 text-eyebrow" />Please review add-ons</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">Things added on the day beyond the agreed plan.</p>
            {pendingAddons.map((m) => (
              <div key={m.id} className="space-y-2">
                <ul className="divide-y text-sm">
                  {m.extras.map((e) => (
                    <li key={e.id} className="flex justify-between gap-4 py-2.5">
                      <span className="min-w-0">{e.description}</span>
                      <span className="shrink-0 tabular">{formatINR(extraClientCharge(e))}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-medium">Total</span>
                  <span className="font-serif text-2xl font-semibold tabular">{formatINR(m.amount)}</span>
                </div>
                <ApproveAddons token={token} milestoneId={m.id} />
              </div>
            ))}
          </section></RevealItem>
        )}

        {agreement && agreement.status !== "SIGNED" && (
          <RevealItem><a href={`/p/sign/${agreement.token}`} className="squircle flex min-h-14 items-center justify-between gap-4 rounded-2xl border-2 border-marigold bg-card p-5 font-medium text-maroon transition-colors hover:bg-marigold-soft sm:p-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <span>Your service agreement is waiting for your signature</span>
            <span aria-hidden className="shrink-0 text-lg">→</span>
          </a></RevealItem>
        )}

        <RevealItem><section className="squircle rounded-2xl border bg-card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Icon name="checklist" className="size-6 shrink-0 text-eyebrow" />Planning progress</h2>
            <span className="text-lg font-semibold tabular">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" aria-label="Planning progress" />
          <p className="mt-3 text-sm text-muted-foreground">
            {w.tasks.length ? `${done} of ${w.tasks.length} planning tasks done by your team` : "Your plan starts as soon as the booking payment is received."}
          </p>
        </section></RevealItem>

        {w.events.length > 0 && (
          <RevealItem><section className="squircle rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold"><Icon name="event" className="size-6 shrink-0 text-eyebrow" />Your celebrations</h2>
            <ul className="space-y-4">
              {w.events.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="squircle grid size-10 shrink-0 place-items-center rounded-xl bg-marigold-soft text-maroon">
                    <CalendarHeart className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{e.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(e.startsAt)}
                      {e.venue ? ` · ${e.venue}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section></RevealItem>
        )}

        <RevealItem><section className="squircle rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold"><Icon name="wallet" className="size-6 shrink-0 text-eyebrow" />Payment schedule</h2>
          {w.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your planner will share the payment schedule once the plan is confirmed.</p>
          ) : (
          <ol className="space-y-4">
            {w.milestones.map((m) => {
              const overdue = m.status === "DUE" && m.dueDate < new Date();
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2",
                      m.status === "PAID" ? "border-teal bg-teal text-background" : overdue ? "border-rose" : "border-marigold",
                    )}
                  >
                    {m.status === "PAID" && <CheckDraw delay={0.15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-pretty">{m.label}</span>
                    <span className={cn("text-sm", overdue ? "text-rose" : "text-muted-foreground")}>
                      {m.status === "PAID" ? `Paid ${m.paidAt ? formatDate(m.paidAt) : ""}` : `Due ${formatDate(m.dueDate)}`}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular">{formatINR(m.amount)}</span>
                </li>
              );
            })}
          </ol>
          )}
        </section></RevealItem>

        {w.leadPlanner && (
          <RevealItem><section className="squircle flex items-center gap-3 rounded-2xl border bg-card p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Your planner</p>
              <p className="truncate font-serif text-2xl font-semibold">{w.leadPlanner.name}</p>
            </div>
            <a href={`mailto:${w.leadPlanner.email}`} className="grid size-11 shrink-0 place-items-center rounded-full border transition-colors hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`Email ${w.leadPlanner.name}`}>
              <MessageCircle className="size-5" aria-hidden />
            </a>
            <a href="tel:+911412345678" className="grid size-11 shrink-0 place-items-center rounded-full bg-cta text-cta-foreground transition-opacity hover:opacity-90 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Call The Royal Knot">
              <Phone className="size-5" aria-hidden />
            </a>
          </section></RevealItem>
        )}
      </Reveal>
    </main>
    </ViewTransition>
  );
}
