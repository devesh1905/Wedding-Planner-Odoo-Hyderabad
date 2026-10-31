"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/frontend/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { Field } from "@/frontend/components/common/field";
import { api, ApiError } from "@/frontend/lib/api-client";
import { staffEnquiryInput } from "@/shared/validation/enquiry";
import { EnquiryFields, emptyEnquiry, toPayload, type EnquiryValues } from "./enquiry-fields";
import type { Planner } from "./types";

const SOURCE_LABEL: Record<string, string> = {
  PHONE: "Phone call",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  WEB_FORM: "Web form",
};

export function NewEnquiryDialog({ planners }: { planners: Planner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<EnquiryValues>(emptyEnquiry);
  const [source, setSource] = useState("PHONE");
  const [assignedToId, setAssignedToId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...toPayload(values), source, assignedToId };
    const check = staffEnquiryInput.safeParse(payload);
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await api("/api/enquiries", { method: "POST", body: payload });
      toast.success(`Enquiry added for ${values.partner1} & ${values.partner2}`);
      setOpen(false);
      setValues(emptyEnquiry);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New enquiry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">New enquiry</DialogTitle>
          <DialogDescription>For couples who called, messaged on WhatsApp or found us on Instagram.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Came in via">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assign to" hint="Defaults to you">
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Me" />
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
          </div>
          <EnquiryFields values={values} errors={errors} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save enquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
