"use client";

import { WhatsAppLink } from "@/frontend/components/common/whatsapp-link";
import { reminderText } from "@/shared/reminders";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { StagePill } from "@/frontend/components/common/stage-pill";
import { Amount } from "@/frontend/components/common/amount";
import { Icon, type IconName } from "@/frontend/components/icons/icon";
import { Field } from "@/frontend/components/common/field";
import { api, ApiError } from "@/frontend/lib/api-client";
import { formatDate, formatINR, relativeDays } from "@/shared/format";
import { cn } from "@/shared/utils";

type Milestone = {
  id: string;
  type: string;
  label: string;
  amount: number;
  dueDate: string | Date;
  status: string;
  paidAt: string | Date | null;
  reference: string | null;
};

export function PaymentsTab({
  milestones,
  contractValue,
  remind,
}: {
  milestones: Milestone[];
  contractValue: number;
  /** couple contact for WhatsApp payment reminders */
  remind?: { phone: string; portalToken: string; name: string };
}) {
  const [paying, setPaying] = useState<Milestone | null>(null);
  const received = milestones.filter((m) => m.status === "PAID").reduce((s, m) => s + m.amount, 0);
  const addons = milestones.filter((m) => m.type === "ADDON" && m.status !== "CANCELLED").reduce((s, m) => s + m.amount, 0);
  const total = contractValue + addons;
  const now = new Date();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-6">
        {milestones.map((m) => {
          const overdue = m.status === "DUE" && new Date(m.dueDate) < now;
          return (
            <li key={m.id} className="relative">
              <span
                className={cn(
                  "absolute top-4 -left-[33px] grid size-4 place-items-center rounded-full border-2 bg-background",
                  m.status === "PAID" ? "border-teal bg-teal" : overdue ? "border-rose" : "border-marigold",
                )}
              >
                {m.status === "PAID" && <Check className="size-2.5 text-white" />}
              </span>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.label}</p>
                  <p className={cn("text-sm", overdue ? "text-rose" : "text-muted-foreground")}>
                    {m.status === "PAID"
                      ? `Received ${m.paidAt ? formatDate(m.paidAt) : ""} · Ref ${m.reference}`
                      : `Due ${formatDate(m.dueDate)} · ${relativeDays(m.dueDate)}`}
                  </p>
                </div>
                <Amount rupees={m.amount} className="font-serif text-xl" />
                <StagePill status={overdue ? "OVERDUE" : m.status} />
                {overdue && remind && (
                  <WhatsAppLink
                    phone={remind.phone}
                    path={`/p/${remind.portalToken}`}
                    message={reminderText(remind.name, m.label, m.amount, m.dueDate)}
                    label="Remind"
                  />
                )}
                {m.status === "DUE" && (
                  <Button size="sm" onClick={() => setPaying(m)}>
                    Record payment
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <aside className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="wallet" className="size-4" /> Client account
        </h3>
        <Row icon="doc" label="Contract" value={contractValue} />
        <Row icon="add" label="Add-ons billed" value={addons} />
        <Row icon="bill" label="Total billable" value={total} strong />
        <Row icon="check" label="Received" value={received} tone="text-teal" />
        <div className="border-t pt-3">
          <Row icon="warning" label="Outstanding" value={total - received} strong tone={total - received > 0 ? "text-rose" : "text-teal"} />
        </div>
      </aside>

      <PayDialog milestone={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function Row({ icon, label, value, strong, tone }: { icon: IconName; label: string; value: number; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon name={icon} className="size-3.5" /> {label}
      </span>
      <Amount rupees={value} className={cn(strong && "text-base font-semibold", tone)} />
    </div>
  );
}

function PayDialog({ milestone, onClose }: { milestone: Milestone | null; onClose: () => void }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!milestone) return;
    setPending(true);
    try {
      const r = await api<{ planCreated: number }>(`/api/milestones/${milestone.id}/pay`, { method: "POST", body: { reference, paidAt } });
      toast.success(r.planCreated ? `Payment recorded — ${r.planCreated} planning tasks created automatically` : `${formatINR(milestone.amount)} recorded`);
      setReference("");
      setErrors({});
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setErrors({ reference: err instanceof Error ? err.message : "Could not record" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={!!milestone} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Record payment</DialogTitle>
          <DialogDescription>
            {milestone?.label} · <b>{milestone && formatINR(milestone.amount)}</b>
            {milestone?.type === "BOOKING" && " — recording this generates the wedding plan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Payment reference (UTR / cheque no.)" error={errors.reference} hint="Each reference can be used only once">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR 4521 8890 1123" autoFocus />
          </Field>
          <Field label="Received on" error={errors.paidAt}>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Confirm payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
