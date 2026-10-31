"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/common/field";
import { api, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const PACKAGES = [
  { kind: "FULL_SERVICE", name: "Full-Service", hint: "Theme, venue, vendors, guests, rehearsal & day-of" },
  { kind: "PARTIAL", name: "Partial / Day-of", hint: "Schedule, vendor check-in, family cues, clear-up" },
];

type Props = {
  enquiry: { id: string; roughDate: string | null; city: string | null; guestCount: number | null; maxBudget: number | null };
  trigger: React.ReactNode;
  onDone: (weddingId: string) => void;
};

export function ConvertDialog({ enquiry, trigger, onDone }: Props) {
  const start = enquiry.roughDate?.slice(0, 10) ?? "";
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    packageKind: "FULL_SERVICE",
    startDate: start,
    endDate: start ? new Date(new Date(start).getTime() + 2 * 86_400_000).toISOString().slice(0, 10) : "",
    city: enquiry.city && enquiry.city !== "Other" ? enquiry.city : "",
    venue: "",
    guestCount: enquiry.guestCount ? String(enquiry.guestCount) : "",
    contractValue: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const contract = Number(v.contractValue) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await api<{ id: string; code: string }>(`/api/enquiries/${enquiry.id}/convert`, { method: "POST", body: v });
      toast.success(`Wedding ${res.code} created with its payment plan`);
      setOpen(false);
      onDone(res.id);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err instanceof Error ? err.message : "Could not convert");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Convert to wedding</DialogTitle>
          <DialogDescription>Creates the wedding, the couple's portal link and a staged payment plan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {PACKAGES.map((p) => (
              <button
                key={p.kind}
                type="button"
                onClick={() => setV((s) => ({ ...s, packageKind: p.kind }))}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  v.packageKind === p.kind ? "border-maroon bg-maroon-soft ring-1 ring-maroon" : "hover:bg-muted",
                )}
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.hint}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First event day" error={errors.startDate}>
              <Input type="date" value={v.startDate} onChange={set("startDate")} />
            </Field>
            <Field label="Last event day" error={errors.endDate}>
              <Input type="date" value={v.endDate} onChange={set("endDate")} min={v.startDate} />
            </Field>
            <Field label="City" error={errors.city}>
              <Input value={v.city} onChange={set("city")} placeholder="Udaipur" />
            </Field>
            <Field label="Venue" error={errors.venue}>
              <Input value={v.venue} onChange={set("venue")} placeholder="City Palace" />
            </Field>
            <Field label="Guests" error={errors.guestCount}>
              <Input type="number" inputMode="numeric" value={v.guestCount} onChange={set("guestCount")} />
            </Field>
            <Field label="Contract value (₹)" error={errors.contractValue} hint={enquiry.maxBudget ? `Budget up to ${formatINR(enquiry.maxBudget)}` : undefined}>
              <Input type="number" inputMode="numeric" value={v.contractValue} onChange={set("contractValue")} placeholder="4500000" />
            </Field>
          </div>
          {contract > 0 && (
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-center text-xs">
              <Stage label="Booking 20%" value={contract * 0.2} />
              <Stage label="Advance 50%" value={contract * 0.5} />
              <Stage label="Final 30%" value={contract * 0.3} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Create wedding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stage({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular">{formatINR(Math.round(value))}</p>
    </div>
  );
}
