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
      <Reveal className="mx-auto max-w-xl space-y-5 px-4 py-8">
        <header className="space-y-3 text-center">
          <div className="flex justify-end">
            <SoundToggle />
          </div>
          <p className="text-xs tracking-[0.25em] text-eyebrow uppercase">The Royal Knot</p>
          <h1 className="text-5xl leading-tight font-semibold">
            {w.partner1} & {w.partner2}
          </h1>
          <div className="ornament mx-auto w-32" />
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="size-4" /> {w.venue ? `${w.venue}, ` : ""}
            {w.city}
          </p>
        </header>

        <RevealItem><section className="rounded-3xl bg-maroon p-6 text-center text-primary-foreground shadow-lg">
          {days > 0 ? (
            <>
              <p><FlipCountdown days={days} /></p>
              <p className="text-sm opacity-80">days to go · {formatDate(w.startDate)}</p>
            </>
          ) : days > -3 ? (
            <p className="font-serif text-3xl font-semibold">It's your wedding week!</p>
          ) : (
            <p className="font-serif text-3xl font-semibold">Married {relativeDays(w.startDate)} 💛</p>
          )}
        </section></RevealItem>

        {pendingAddons.length > 0 && (
          <RevealItem><section className="rounded-2xl border-2 border-marigold bg-card p-5">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Icon name="billCheck" className="size-6 text-eyebrow" />Please review add-ons</h2>
            <p className="mb-3 text-sm text-muted-foreground">Things added on the day beyond the agreed plan.</p>
            {pendingAddons.map((m) => (
              <div key={m.id} className="space-y-2">
                <ul className="divide-y text-sm">
                  {m.extras.map((e) => (
                    <li key={e.id} className="flex justify-between py-2">
                      <span>{e.description}</span>
                      <span className="tabular">{formatINR(extraClientCharge(e))}</span>
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
          <a href={`/p/sign/${agreement.token}`} className="block rounded-2xl border-2 border-marigold bg-card p-5 text-center font-medium text-maroon">
            Your service agreement is waiting for your signature →
          </a>
        )}

        <RevealItem><section className="rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-semibold"><Icon name="checklist" className="size-6 text-eyebrow" />Planning progress</h2>
            <span className="font-semibold tabular">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {w.tasks.length ? `${done} of ${w.tasks.length} planning tasks done by your team` : "Your plan starts as soon as the booking payment is received."}
          </p>
        </section></RevealItem>

        {w.events.length > 0 && (
          <RevealItem><section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-2xl font-semibold"><Icon name="event" className="size-6 text-eyebrow" />Your celebrations</h2>
            <ul className="space-y-3">
              {w.events.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-marigold-soft text-maroon">
                    <CalendarHeart className="size-5" />
                  </span>
                  <span>
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

        <RevealItem><section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-semibold"><Icon name="wallet" className="size-6 text-eyebrow" />Payment schedule</h2>
          <ol className="space-y-3">
            {w.milestones.map((m) => {
              const overdue = m.status === "DUE" && m.dueDate < new Date();
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2",
                      m.status === "PAID" ? "border-teal bg-teal text-white" : overdue ? "border-rose" : "border-marigold",
                    )}
                  >
                    {m.status === "PAID" && <CheckDraw delay={0.15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.label}</span>
                    <span className={cn("text-sm", overdue ? "text-rose" : "text-muted-foreground")}>
                      {m.status === "PAID" ? `Paid ${m.paidAt ? formatDate(m.paidAt) : ""}` : `Due ${formatDate(m.dueDate)}`}
                    </span>
                  </span>
                  <span className="tabular">{formatINR(m.amount)}</span>
                </li>
              );
            })}
          </ol>
        </section></RevealItem>

        {w.leadPlanner && (
          <RevealItem><section className="flex items-center gap-3 rounded-2xl border bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Your planner</p>
              <p className="font-serif text-xl font-semibold">{w.leadPlanner.name}</p>
            </div>
            <a href={`mailto:${w.leadPlanner.email}`} className="rounded-full border p-2.5 hover:bg-muted" aria-label="Email planner">
              <MessageCircle className="size-5" />
            </a>
            <a href="tel:+911412345678" className="rounded-full bg-maroon p-2.5 text-primary-foreground" aria-label="Call The Royal Knot">
              <Phone className="size-5" />
            </a>
          </section></RevealItem>
        )}
      </Reveal>
    </main>
    </ViewTransition>
  );
}
