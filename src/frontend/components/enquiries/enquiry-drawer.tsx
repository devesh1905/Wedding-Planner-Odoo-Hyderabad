"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSignature,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Icon, type IconName } from "@/frontend/components/icons/icon";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/frontend/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { Separator } from "@/frontend/components/ui/separator";
import { StagePill } from "@/frontend/components/common/stage-pill";
import { Field } from "@/frontend/components/common/field";
import { SlotPicker, type SlotDay } from "./slot-picker";
import { api, ApiError } from "@/frontend/lib/api-client";
import { formatDate, formatDateTime, formatINR, formatINRCompact, relativeDays } from "@/shared/format";
import { EVENT_LABELS, PLANNING, serviceByKey, type EventKey } from "@/shared/package-builder";
import { ConvertDialog } from "./convert-dialog";
import type { Planner } from "./types";

type Detail = {
  id: string;
  partner1: string;
  partner2: string;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  roughDate: string | null;
  guestCount: number | null;
  theme: string | null;
  maxBudget: number | null;
  city: string | null;
  notes: string | null;
  services: string[];
  events: string[];
  planning: string | null;
  estimateLow: number | null;
  estimateHigh: number | null;
  nextFollowUp: string | null;
  assignedToId: string | null;
  createdAt: string;
  meetings: { id: string; scheduledAt: string; location: string | null; notes: string | null }[];
  agreement: { token: string; status: string; sentAt: string | null; signedAt: string | null; signerName: string | null; signatureUrl: string | null } | null;
  wedding: { id: string; code: string } | null;
  activity: { id: string; action: string; createdAt: string; payload: Record<string, string> | null; actor: { name: string } | null }[];
};

const ACTION_TEXT: Record<string, (p: Record<string, string> | null) => string> = {
  created: (p) => `Enquiry received${p?.source ? ` via ${p.source.replace("_", " ").toLowerCase()}` : ""}`,
  status: (p) => `Moved ${p?.from?.replace(/_/g, " ").toLowerCase()} → ${p?.to?.replace(/_/g, " ").toLowerCase()}`,
  meeting: (p) => `Meeting booked for ${p?.at ? formatDateTime(p.at) : ""}`,
  agreement_sent: () => "Agreement sent",
  agreement_signed: (p) => `Agreement signed by ${p?.by ?? "couple"}`,
  converted: (p) => `Converted to wedding ${p?.code ?? ""}`,
};

export function EnquiryDrawer({ id, planners, onClose }: { id: string | null; planners: Planner[]; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await api<Detail>(`/api/enquiries/${id}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load enquiry");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>, msg?: string) {
    if (!id) return;
    try {
      await api(`/api/enquiries/${id}`, { method: "PATCH", body });
      if (msg) toast.success(msg);
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!data ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Loading enquiry</SheetTitle>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-2 border-b bg-paper p-6">
              <div className="flex items-center gap-2">
                <StagePill status={data.status} />
                <span className="text-xs text-muted-foreground">Received {relativeDays(data.createdAt)}</span>
              </div>
              <SheetTitle className="font-serif text-3xl">
                {data.partner1} & {data.partner2}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:+91${data.phone}`}>
                    <Phone /> {data.phone}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/91${data.phone}`} target="_blank" rel="noreferrer">
                    <MessageCircle /> WhatsApp
                  </a>
                </Button>
                {data.status !== "LOST" && data.status !== "SIGNED" && (
                  <Button size="sm" variant="ghost" className="text-rose" onClick={() => patch({ status: "LOST" }, "Marked as lost")}>
                    <XCircle /> Mark lost
                  </Button>
                )}
                {data.status === "LOST" && (
                  <Button size="sm" variant="ghost" onClick={() => patch({ status: "CONTACTED" }, "Reopened")}>
                    Reopen
                  </Button>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-6">
              <section className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Fact icon="calendar" label="Rough date" value={data.roughDate ? formatDate(data.roughDate) : "—"} />
                <Fact icon="pin" label="City" value={data.city ?? "—"} />
                <Fact icon="guests" label="Guests" value={data.guestCount ?? "—"} />
                <Fact icon="wallet" label="Budget" value={data.maxBudget ? `up to ${formatINR(data.maxBudget)}` : "—"} />
                <Fact icon="palette" label="Theme" value={data.theme ?? "—"} />
                <Fact icon="mail" label="Email" value={data.email ?? "—"} />
                {data.notes && <Fact icon="notes" label="Notes" value={data.notes} wide />}
              </section>

              {data.services.length > 0 && <RequestedPackage data={data} />}

              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Assigned planner">
                  <Select value={data.assignedToId ?? ""} onValueChange={(v) => patch({ assignedToId: v }, "Reassigned")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {planners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Next follow-up">
                  <Input
                    type="date"
                    defaultValue={data.nextFollowUp?.slice(0, 10) ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (data.nextFollowUp?.slice(0, 10) ?? "")) patch({ nextFollowUp: v || null }, "Follow-up updated");
                    }}
                  />
                </Field>
              </section>

              <Separator />
              <Meetings data={data} onDone={load} />
              <Separator />
              <AgreementPanel data={data} onDone={load} />

              {data.activity.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                      <Icon name="clock" className="size-4" /> Timeline
                    </h3>
                    <ol className="space-y-3 border-l pl-4">
                      {data.activity.map((a) => (
                        <li key={a.id} className="relative text-sm">
                          <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-marigold" />
                          <p>{ACTION_TEXT[a.action]?.(a.payload) ?? a.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(a.createdAt)}
                            {a.actor && ` · ${a.actor.name}`}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function RequestedPackage({ data }: { data: Detail }) {
  const plan = PLANNING.find((p) => p.key === data.planning);
  return (
    <section className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Icon name="gift" className="size-4" /> Requested package
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Planning</dt>
          <dd className="font-medium">{plan?.label ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Indicative estimate</dt>
          <dd className="font-medium tabular">
            {data.estimateLow != null && data.estimateHigh != null
              ? `${formatINRCompact(data.estimateLow)} – ${formatINRCompact(data.estimateHigh)}`
              : "—"}
          </dd>
        </div>
        {data.events.length > 0 && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Events</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {data.events.map((ev) => (
                <span key={ev} className="rounded-full border bg-card px-2.5 py-0.5 text-xs">
                  {EVENT_LABELS[ev as EventKey] ?? ev}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {data.services.map((k) => {
          const s = serviceByKey(k);
          return (
            <li key={k} className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
              <Icon name={s?.icon ?? "check"} className="size-4 text-maroon" /> {s?.label ?? k}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Fact({ icon, label, value, wide }: { icon: IconName; label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon name={icon} className="size-3.5" /> {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Meetings({ data, onDone }: { data: Detail; onDone: () => Promise<void> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  // Free/busy for the next working days, loaded when the booking form opens.
  const [days, setDays] = useState<SlotDay[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setDays(null);
    api<{ days: SlotDay[] }>("/api/meetings/availability")
      .then((r) => setDays(r.days))
      .catch(() => toast.error("Could not load free times"));
  }, [open]);

  async function book() {
    setPending(true);
    try {
      await api(`/api/enquiries/${data.id}/meetings`, { method: "POST", body: { scheduledAt: at, location, notes } });
      toast.success("Meeting booked");
      setOpen(false);
      setAt("");
      setLocation("");
      setNotes("");
      setErrors({});
      await onDone();
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else toast.error(e instanceof Error ? e.message : "Could not book");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="calendar" className="size-4" /> Meetings
        </h3>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <CalendarPlus /> Book meeting
          </Button>
        )}
      </div>
      {data.meetings.length === 0 && !open && <p className="text-sm text-muted-foreground">No meeting booked yet.</p>}
      <ul className="space-y-2">
        {data.meetings.map((m) => (
          <li key={m.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="font-medium">{formatDateTime(m.scheduledAt)}</p>
            {(m.location || m.notes) && <p className="text-muted-foreground">{[m.location, m.notes].filter(Boolean).join(" · ")}</p>}
          </li>
        ))}
      </ul>
      {open && (
        <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
          {days ? (
            <SlotPicker
              className="max-w-none"
              days={days}
              durations={[60]}
              host={{ name: data.partner1 + " & " + data.partner2, title: "Planning meeting" }}
              onBook={({ date, start }) =>
                setAt(`${date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}:00+05:30`)
              }
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading free times…
            </p>
          )}
          {errors.scheduledAt && <p className="text-xs text-rose">{errors.scheduledAt}</p>}
          <Field label="Where" error={errors.location}>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office, video call, venue…" />
          </Field>
          <Field label="Notes" error={errors.notes}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={book} disabled={pending || !at}>
              {pending && <Loader2 className="animate-spin" />} Book
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function AgreementPanel({ data, onDone }: { data: Detail; onDone: () => Promise<void> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const a = data.agreement;
  const link = a ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/sign/${a.token}` : "";

  async function send() {
    setPending(true);
    try {
      await api(`/api/enquiries/${data.id}/agreement`, { method: "POST" });
      toast.success("Agreement ready — share the link with the couple");
      await onDone();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create agreement");
    } finally {
      setPending(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(link);
    toast.success("Signing link copied");
  }

  const waText = encodeURIComponent(`Hi ${data.partner1}, here is your service agreement from The Royal Knot. Please review and sign: ${link}`);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="sign" className="size-4" /> Service agreement
        </h3>
        {a && <StagePill status={a.status === "SENT" ? "AGREEMENT_SENT" : a.status} label={a.status === "SENT" ? "Awaiting signature" : undefined} />}
      </div>

      {!a && (
        <div className="rounded-xl border border-dashed p-4 text-sm">
          <p className="text-muted-foreground">Vendor lists and floor plans stay locked until the couple signs.</p>
          <Button className="mt-3" onClick={send} disabled={pending || data.status === "LOST"}>
            {pending ? <Loader2 className="animate-spin" /> : <FileSignature />} Create & send agreement
          </Button>
        </div>
      )}

      {a?.status === "SENT" && (
        <div className="space-y-3 rounded-xl border bg-marigold-soft/50 p-4 text-sm">
          <p>Sent {a.sentAt ? relativeDays(a.sentAt) : ""}. Share this link — the couple signs on their phone.</p>
          <div className="flex gap-2">
            <Input readOnly value={link} className="bg-card text-xs" />
            <Button size="icon" variant="outline" onClick={copy} aria-label="Copy link">
              <Copy />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`https://wa.me/91${data.phone}?text=${waText}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Send on WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink /> Open
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={async () => { await onDone(); router.refresh(); }}>
              Check status
            </Button>
          </div>
        </div>
      )}

      {a?.status === "SIGNED" && (
        <div className="space-y-3 rounded-xl border bg-teal-soft/60 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-teal">
            <Check className="size-4" /> Signed by {a.signerName} · {a.signedAt && formatDateTime(a.signedAt)}
          </p>
          {a.signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.signatureUrl} alt={`Signature of ${a.signerName}`} className="h-20 rounded-md border bg-white p-1" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink /> View signed copy
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/public/agreements/${a.token}/pdf`} target="_blank" rel="noreferrer">
                <Download /> Download PDF
              </a>
            </Button>
            {data.wedding ? (
              <Button asChild size="sm">
                <Link href={`/weddings/${data.wedding.id}`}>Open wedding {data.wedding.code}</Link>
              </Button>
            ) : (
              <ConvertDialog
                enquiry={data}
                onDone={async (weddingId) => {
                  await onDone();
                  router.push(`/weddings/${weddingId}`);
                }}
                trigger={
                  <Button size="sm">
                    <Sparkles /> Convert to wedding
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
