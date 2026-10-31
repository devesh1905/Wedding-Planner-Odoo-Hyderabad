import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/backend/db";
import { KnotMark } from "@/frontend/components/home/knot-mark";
import { formatDate, formatTime } from "@/shared/format";
import { PassQr } from "./pass-qr";

export const metadata: Metadata = { title: "Your gate pass", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TOKEN = /^[a-zA-Z0-9_-]{16,256}$/;

/**
 * A vendor's gate pass for one booking — like a boarding pass. The planner shares this link;
 * on the day the vendor shows the QR at the gate and the control room scans it to check them in.
 */
export default async function VendorPass({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) notFound();
  const booking = await db.booking.findUnique({
    where: { checkinToken: token },
    select: {
      category: true,
      expectedArrival: true,
      vendor: { select: { name: true } },
      wedding: { select: { partner1: true, partner2: true, venue: true, city: true, startDate: true } },
      checkins: { take: 1, orderBy: { arrivedAt: "asc" }, select: { arrivedAt: true } },
    },
  });
  if (!booking) notFound();
  const w = booking.wedding;
  const arrived = booking.checkins[0]?.arrivedAt;

  return (
    <main className="min-h-svh bg-paper">
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center">
        <KnotMark mode="ignite" className="h-12 w-24 text-maroon" />

        <section className="squircle mt-6 w-full rounded-3xl border bg-card p-6 shadow-sm">
          <h1 className="text-3xl leading-tight font-semibold">
            {booking.vendor.name}
            <span className="ml-2 align-middle text-base font-normal text-muted-foreground capitalize">
              · {booking.category.toLowerCase().replace("_", " ")}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {w.partner1} & {w.partner2} · {w.venue ? `${w.venue}, ` : ""}
            {w.city}
          </p>

          <div className="my-6 flex justify-center">
            <PassQr token={token} label={booking.vendor.name} />
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-left text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatDate(w.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Arrive by</dt>
              <dd className="font-medium tabular-nums">{booking.expectedArrival ? formatTime(booking.expectedArrival) : "Ask your planner"}</dd>
            </div>
          </dl>
          {arrived ? (
            <p className="mt-4 rounded-xl bg-teal-soft px-3 py-2 text-sm font-medium text-teal">Checked in at {formatTime(arrived)}</p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Show this QR at the gate. Keep it private — it is your entry pass.</p>
          )}
        </section>
      </div>
    </main>
  );
}
