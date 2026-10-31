"use client";

import { startTransition, useState, ViewTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { EnquiryFields, emptyEnquiry, toPayload, type EnquiryValues } from "@/frontend/components/enquiries/enquiry-fields";
import { enquiryInput } from "@/shared/validation/enquiry";
import { api, ApiError } from "@/frontend/lib/api-client";
import { cue } from "@/frontend/lib/sound";
import { petalShower } from "@/frontend/components/home/petals";

export function EnquireForm() {
  const [values, setValues] = useState<EnquiryValues>(emptyEnquiry);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = toPayload(values);
    // Same schema as the server, so users see errors before the round trip.
    const check = enquiryInput.safeParse(payload);
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [String(i.path[0]), i.message])));
      cue("error");
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const res = await api<{ reference: string }>("/api/public/enquiries", { method: "POST", body: payload });
      // a transition, so the form card morphs into the thank-you card
      startTransition(() => setReference(res.reference));
      cue("success", "strong");
      petalShower("soft");
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setErrors({ form: err instanceof Error ? err.message : "Could not send" });
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <ViewTransition name="enquiry-card" share="morph" default="none">
        <div role="status" className="squircle rounded-2xl border bg-card px-6 py-10 text-center shadow-sm sm:px-10">
          <CheckCircle2 className="mx-auto size-10 text-teal" aria-hidden />
          <h2 className="mt-4 text-3xl font-semibold text-balance">Thank you, {values.partner1}!</h2>
          <p className="mt-2 text-pretty text-muted-foreground">Your enquiry is with our planning team. We'll call you within 24 hours.</p>
          <div className="ornament mx-auto mt-8 w-24" />
          <p className="mt-6 text-xs tracking-[0.2em] text-muted-foreground uppercase">Your reference</p>
          <p className="mt-1 text-lg font-semibold tracking-wide tabular">{reference}</p>
        </div>
      </ViewTransition>
    );
  }

  return (
    <ViewTransition name="enquiry-card" share="morph" default="none">
    <form onSubmit={submit} noValidate className="squircle space-y-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <EnquiryFields sound values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
      {errors.form && <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-sm text-rose">{errors.form}</p>}
      <Button type="submit" size="lg" className="squircle h-12 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="animate-spin" />} {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
    </ViewTransition>
  );
}
