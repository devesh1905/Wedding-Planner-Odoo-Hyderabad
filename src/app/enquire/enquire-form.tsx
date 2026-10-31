"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnquiryFields, emptyEnquiry, toPayload, type EnquiryValues } from "@/components/enquiries/enquiry-fields";
import { enquiryInput } from "@/lib/validation/enquiry";
import { api, ApiError } from "@/lib/api-client";
import { cue } from "@/lib/sound";

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
      setReference(res.reference);
      cue("success", "strong");
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setErrors({ form: err instanceof Error ? err.message : "Could not send" });
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-teal" />
        <h2 className="mt-4 text-3xl font-semibold">Thank you, {values.partner1}!</h2>
        <p className="mt-2 text-muted-foreground">Your enquiry is with our planning team. We'll call you within 24 hours.</p>
        <p className="mt-6 inline-block rounded-full bg-marigold-soft px-4 py-1.5 text-sm">
          Reference <b className="tabular">{reference}</b>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <EnquiryFields sound values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
      {errors.form && <p className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">{errors.form}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Send enquiry
      </Button>
    </form>
  );
}
