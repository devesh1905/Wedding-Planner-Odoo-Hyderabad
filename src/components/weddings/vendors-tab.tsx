import { Phone, QrCode, Store } from "lucide-react";
import { Amount } from "@/components/common/amount";
import { EmptyState } from "@/components/common/empty-state";
import { formatTime } from "@/lib/format";

type Booking = {
  id: string;
  category: string;
  agreedAmount: number;
  perPlate: number | null;
  agreedGuests: number | null;
  agreedHours: number | null;
  hourlyRate: number | null;
  expectedArrival: string | Date | null;
  checkinToken: string;
  vendor: { id: string; name: string; phone: string };
};

// Booked vendors for this wedding. The quote-request panel (invite vendors, compare, award)
// mounts above this list once the vendors & quotes module is merged.
export function VendorsTab({ weddingId, bookings, quotePanel }: { weddingId: string; bookings: Booking[]; quotePanel?: React.ReactNode }) {
  return (
    <div className="space-y-6" data-wedding={weddingId}>
      {quotePanel}
      <section className="rounded-2xl border bg-card">
        <header className="flex items-center justify-between border-b p-4">
          <h3 className="text-xl font-semibold">Booked vendors</h3>
          <span className="text-sm text-muted-foreground">
            Total agreed <Amount rupees={bookings.reduce((s, b) => s + b.agreedAmount, 0)} />
          </span>
        </header>
        {bookings.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Store} title="No vendors booked yet" hint="Request quotes, compare them side by side and choose a winner to book a vendor." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Vendor</th>
                  <th className="p-3 font-medium">Agreed terms</th>
                  <th className="p-3 font-medium">Arrives</th>
                  <th className="p-3 text-right font-medium">Agreed</th>
                  <th className="p-3 font-medium">Gate pass</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="p-3 capitalize">{b.category.toLowerCase()}</td>
                    <td className="p-3">
                      <p className="font-medium">{b.vendor.name}</p>
                      <a href={`tel:+91${b.vendor.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-maroon">
                        <Phone className="size-3" /> {b.vendor.phone}
                      </a>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {b.perPlate != null && b.agreedGuests != null ? (
                        <>
                          <Amount rupees={b.perPlate} className="font-normal" /> × {b.agreedGuests} plates
                        </>
                      ) : b.hourlyRate != null && b.agreedHours != null ? (
                        <>
                          {b.agreedHours} h · extra <Amount rupees={b.hourlyRate} className="font-normal" />/h
                        </>
                      ) : (
                        "Fixed price"
                      )}
                    </td>
                    <td className="p-3 tabular">{b.expectedArrival ? formatTime(b.expectedArrival) : "—"}</td>
                    <td className="p-3 text-right">
                      <Amount rupees={b.agreedAmount} />
                    </td>
                    <td className="p-3">
                      {/* the vendor's own pass page: open it, show the QR, scan it from the control room */}
                      <a
                        href={`/v/pass/${b.checkinToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <QrCode className="size-3.5" /> Open pass
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
