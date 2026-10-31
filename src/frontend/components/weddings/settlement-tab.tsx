"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/frontend/components/icons/icon";
import { CheckCircle2, FileText, Loader2, PartyPopper, Plus, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Switch } from "@/frontend/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Amount } from "@/frontend/components/common/amount";
import { StagePill } from "@/frontend/components/common/stage-pill";
import { Field } from "@/frontend/components/common/field";
import { EmptyState } from "@/frontend/components/common/empty-state";
import { api, ApiError } from "@/frontend/lib/api-client";
import { bookingTotals, extraClientCharge, extraCost } from "@/shared/settlement";
import { formatINR } from "@/shared/format";
import { cn } from "@/shared/utils";

type Extra = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  clientUnitPrice: number | null;
  billableToClient: boolean;
  milestoneId: string | null;
};
type Booking = {
  id: string;
  category: string;
  agreedAmount: number;
  perPlate: number | null;
  agreedGuests: number | null;
  agreedHours: number | null;
  hourlyRate: number | null;
  vendor: { name: string };
  extras: Extra[];
  payments: { id: string; amount: number; reference: string; paidAt: string | Date; isAdvance: boolean }[];
  bills: { id: string; billNo: string; amount: number; createdAt: string | Date; match: string }[];
};

type DialogState = { kind: "extra" | "bill" | "pay"; booking: Booking } | null;

export function SettlementTab({ weddingId, stage, bookings }: { weddingId: string; stage: string; bookings: Booking[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = bookings.map((b) => ({ b, t: bookingTotals(b) }));
  const sum = (f: (t: (typeof rows)[number]["t"]) => number) => rows.reduce((s, r) => s + f(r.t), 0);
  const unbilled = bookings.flatMap((b) => b.extras.filter((e) => e.billableToClient && !e.milestoneId).map((e) => ({ ...e, vendor: b.vendor.name })));
  const unbilledTotal = unbilled.reduce((s, e) => s + extraClientCharge(e), 0);
  const allPaid = rows.every((r) => r.t.balance <= 0);

  async function run(key: string, url: string, ok: (r: Record<string, unknown>) => string) {
    setBusy(key);
    try {
      const r = await api<Record<string, unknown>>(url, { method: "POST" });
      toast.success(ok(r));
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function settle() {
    if (await run("settle", `/api/weddings/${weddingId}/settle`, () => "Wedding settled — every rupee accounted for")) {
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.3 }, colors: ["#7a1f2b", "#e8a33d", "#1f5f5b", "#f6e7c8"] });
    }
  }

  if (bookings.length === 0) {
    return <EmptyState icon={Wallet} title="Nothing to settle yet" hint="Vendors appear here once they're booked for this wedding." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="doc" label="Agreed with vendors" value={sum((t) => t.expected - t.extras)} />
        <Kpi icon="add" label="Extras" value={sum((t) => t.extras)} />
        <Kpi icon="check" label="Paid to vendors" value={sum((t) => t.paid)} tone="text-teal" />
        <Kpi icon="warning" label="Still to pay" value={sum((t) => Math.max(t.balance, 0))} tone={allPaid ? "text-teal" : "text-rose"} />
      </div>

      {(unbilled.length > 0 || unbilledTotal > 0) && (
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-marigold/50 bg-marigold-soft/60 p-4">
          <Receipt className="size-6 text-maroon" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {unbilled.length} extra{unbilled.length > 1 ? "s" : ""} not yet billed to the couple · <Amount rupees={unbilledTotal} />
            </p>
            <p className="truncate text-sm text-muted-foreground">{unbilled.map((e) => `${e.description} (${e.vendor})`).join(" · ")}</p>
          </div>
          <Button
            disabled={busy === "addon"}
            onClick={() => run("addon", `/api/weddings/${weddingId}/addon-bill`, (r) => `Add-on bill of ${formatINR(r.amount as number)} created on Payments`)}
          >
            {busy === "addon" && <Loader2 className="animate-spin" />} Bill couple
          </Button>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">
                  <Th icon="shop">Vendor</Th>
                </th>
                <th className="p-3 text-right font-medium">
                  <Th icon="doc" right>
                    Agreed
                  </Th>
                </th>
                <th className="p-3 text-right font-medium">
                  <Th icon="add" right>
                    Extras
                  </Th>
                </th>
                <th className="p-3 font-medium">
                  <Th icon="bill">Vendor bill</Th>
                </th>
                <th className="p-3 text-right font-medium">
                  <Th icon="check" right>
                    Paid
                  </Th>
                </th>
                <th className="p-3 text-right font-medium">
                  <Th icon="wallet" right>
                    Balance
                  </Th>
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, t }) => (
                <tr key={b.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-medium">{b.vendor.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.category.toLowerCase()}</p>
                  </td>
                  <td className="p-3 text-right">
                    <Amount rupees={b.agreedAmount} />
                    {b.perPlate != null && b.agreedGuests != null && (
                      <p className="text-xs text-muted-foreground tabular">
                        {formatINR(b.perPlate)} × {b.agreedGuests}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {t.extras ? <Amount rupees={t.extras} /> : <span className="text-muted-foreground">—</span>}
                    {b.extras.map((e) => (
                      <p key={e.id} className="text-xs text-muted-foreground">
                        {e.description}: {formatINR(extraCost(e))}
                      </p>
                    ))}
                  </td>
                  <td className="p-3">
                    {t.bill == null ? (
                      <span className="text-muted-foreground">Not received</span>
                    ) : (
                      <div className="space-y-1">
                        <Amount rupees={t.bill} />
                        <div>
                          <StagePill status={t.match} />
                        </div>
                        {t.billDiff !== 0 && t.billDiff != null && (
                          <p className={cn("text-xs", t.billDiff > 0 ? "text-rose" : "text-muted-foreground")}>
                            {t.billDiff > 0 ? `${formatINR(t.billDiff)} more than agreed` : `${formatINR(-t.billDiff)} less than agreed`}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Amount rupees={t.paid} />
                    <p className="text-xs text-muted-foreground">
                      {b.payments.length} payment{b.payments.length === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="p-3 text-right">
                    {t.balance <= 0 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-teal">
                        <CheckCircle2 className="size-4" /> Paid
                      </span>
                    ) : (
                      <Amount rupees={t.balance} className="text-rose" />
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "extra", booking: b })}>
                        <Plus /> Extra
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "bill", booking: b })}>
                        <FileText /> Bill
                      </Button>
                      <Button size="sm" variant="outline" disabled={t.balance <= 0} onClick={() => setDialog({ kind: "pay", booking: b })}>
                        Pay
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end">
        {stage === "SETTLED" ? (
          <p className="flex items-center gap-2 font-medium text-teal">
            <PartyPopper className="size-5" /> This wedding is settled
          </p>
        ) : (
          <Button size="lg" onClick={settle} disabled={busy === "settle"}>
            {busy === "settle" ? <Loader2 className="animate-spin" /> : <PartyPopper />} Mark wedding settled
          </Button>
        )}
      </div>

      {dialog?.kind === "extra" && <ExtraDialog booking={dialog.booking} onClose={() => setDialog(null)} />}
      {dialog?.kind === "bill" && <BillDialog booking={dialog.booking} onClose={() => setDialog(null)} />}
      {dialog?.kind === "pay" && <PayDialog booking={dialog.booking} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Th({ icon, right, children }: { icon: IconName; right?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", right && "justify-end")}>
      <Icon name={icon} className="size-3.5" /> {children}
    </span>
  );
}

function Kpi({ icon, label, value, tone }: { icon: IconName; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name={icon} className="size-4" /> {label}
      </p>
      <Amount rupees={value} className={cn("mt-1 block font-serif text-3xl font-semibold", tone)} />
    </div>
  );
}

/** Small helper so each dialog only describes its fields and endpoint. */
function useSubmit(url: string, onDone: () => void) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function submit(body: unknown, success: (r: Record<string, unknown>) => string) {
    setPending(true);
    try {
      const r = await api<Record<string, unknown>>(url, { method: "POST", body });
      toast.success(success(r));
      onDone();
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else setErrors({ form: e instanceof Error ? e.message : "Failed" });
    } finally {
      setPending(false);
    }
  }
  return { errors, pending, submit };
}

function ExtraDialog({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  // Pre-fill from the agreed terms: extra plates at the per-plate rate, extra hours at the hourly rate.
  const preset = b.perPlate
    ? { description: "Extra guests at banquet", unitPrice: b.perPlate, unit: "plates" }
    : b.hourlyRate
      ? { description: "Extended hours", unitPrice: b.hourlyRate, unit: "hours" }
      : { description: "", unitPrice: 0, unit: "units" };
  const [v, setV] = useState({
    description: preset.description,
    qty: "",
    unitPrice: String(preset.unitPrice || ""),
    clientUnitPrice: "",
    billableToClient: true,
  });
  const { errors, pending, submit } = useSubmit(`/api/bookings/${b.id}/extras`, onClose);
  const total = (Number(v.qty) || 0) * (Number(v.unitPrice) || 0);
  const clientTotal = (Number(v.qty) || 0) * (Number(v.clientUnitPrice || v.unitPrice) || 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add extra · {b.vendor.name}</DialogTitle>
          <DialogDescription>Anything beyond the agreed terms. It's added to what we owe the vendor.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ ...v, clientUnitPrice: v.clientUnitPrice || undefined }, () => `Extra of ${formatINR(total)} added`);
          }}
        >
          <Field label="What changed" error={errors.description}>
            <Input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="60 unexpected guests" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantity (${preset.unit})`} error={errors.qty}>
              <Input type="number" inputMode="decimal" autoFocus value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} placeholder="60" />
            </Field>
            <Field label="Vendor rate (₹)" error={errors.unitPrice}>
              <Input type="number" inputMode="numeric" value={v.unitPrice} onChange={(e) => setV({ ...v, unitPrice: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span>
              Bill this to the couple
              <span className="block text-xs text-muted-foreground">Goes on their add-on bill</span>
            </span>
            <Switch checked={v.billableToClient} onCheckedChange={(c) => setV({ ...v, billableToClient: c })} />
          </label>
          {v.billableToClient && (
            <Field label="Rate charged to couple (₹)" hint="Leave empty to charge the vendor's rate" error={errors.clientUnitPrice}>
              <Input
                type="number"
                inputMode="numeric"
                value={v.clientUnitPrice}
                onChange={(e) => setV({ ...v, clientUnitPrice: e.target.value })}
                placeholder={v.unitPrice}
              />
            </Field>
          )}
          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <span>Owed to vendor</span>
              <b className="tabular">{formatINR(total)}</b>
            </div>
            {v.billableToClient && (
              <div className="flex justify-between text-muted-foreground">
                <span>Billed to couple</span>
                <span className="tabular">{formatINR(clientTotal)}</span>
              </div>
            )}
          </div>
          {errors.form && <p className="text-sm text-rose">{errors.form}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Add extra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BillDialog({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const expected = bookingTotals({ ...b, bills: [] }).expected;
  const [billNo, setBillNo] = useState("");
  const [amount, setAmount] = useState("");
  const { errors, pending, submit } = useSubmit(`/api/bookings/${b.id}/bills`, onClose);
  const diff = amount ? Number(amount) - expected : 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Vendor bill · {b.vendor.name}</DialogTitle>
          <DialogDescription>
            Expected: <b>{formatINR(expected)}</b> (agreed + extras)
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ billNo, amount }, (r) =>
              r.match === "MATCHED"
                ? "Bill matches the agreed amount"
                : `Bill recorded — ${r.match === "OVER_BILLED" ? "over" : "under"} by ${formatINR(Math.abs(r.diff as number))}`,
            );
          }}
        >
          <Field label="Bill number" error={errors.billNo}>
            <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="INV-2291" autoFocus />
          </Field>
          <Field label="Bill amount (₹)" error={errors.amount}>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          {amount && (
            <p className={cn("rounded-lg px-3 py-2 text-sm", diff === 0 ? "bg-teal-soft text-teal" : diff > 0 ? "bg-rose-soft text-rose" : "bg-marigold-soft")}>
              {diff === 0
                ? "Matches the agreed amount"
                : diff > 0
                  ? `${formatINR(diff)} more than agreed — check before paying`
                  : `${formatINR(-diff)} less than agreed`}
            </p>
          )}
          {errors.form && <p className="text-sm text-rose">{errors.form}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save bill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const { balance } = bookingTotals(b);
  const [amount, setAmount] = useState(String(balance));
  const [reference, setReference] = useState("");
  const { errors, pending, submit } = useSubmit(`/api/bookings/${b.id}/payments`, onClose);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Pay {b.vendor.name}</DialogTitle>
          <DialogDescription>
            Remaining balance: <b>{formatINR(balance)}</b>
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ amount, reference }, () => `${formatINR(Number(amount))} paid to ${b.vendor.name}`);
          }}
        >
          <Field label="Amount (₹)" error={errors.amount} hint={`Can't exceed ${formatINR(balance)}`}>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} max={balance} />
          </Field>
          <Field label="Payment reference (UTR / cheque no.)" error={errors.reference} hint="A reference can be used only once">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR 8812 0045 7731" autoFocus />
          </Field>
          {errors.form && <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{errors.form}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Confirm payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
