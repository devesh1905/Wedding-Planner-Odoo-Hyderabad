"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/field";
import { CITIES, THEMES } from "@/lib/validation/enquiry";
import { cn } from "@/lib/utils";
import { cue } from "@/lib/sound";

export type EnquiryValues = {
  partner1: string;
  partner2: string;
  phone: string;
  email: string;
  city: string;
  roughDate: string;
  guestCount: string;
  theme: string;
  maxBudget: string;
  notes: string;
};

export const emptyEnquiry: EnquiryValues = {
  partner1: "",
  partner2: "",
  phone: "",
  email: "",
  city: "",
  roughDate: "",
  guestCount: "",
  theme: "",
  maxBudget: "",
  notes: "",
};

/** Turn form strings into the API payload (empty → omitted). */
export function toPayload(v: EnquiryValues) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) if (val.trim() !== "") out[k] = val.trim();
  return out;
}

const BUDGETS = [
  { label: "Under ₹50 L", value: "5000000" },
  { label: "₹50 L – 1 Cr", value: "10000000" },
  { label: "₹1 – 2 Cr", value: "20000000" },
  { label: "₹2 Cr +", value: "30000000" },
];

export function EnquiryFields({
  values,
  errors,
  onChange,
  sound,
}: {
  sound?: boolean;
  values: EnquiryValues;
  errors: Record<string, string>;
  onChange: (k: keyof EnquiryValues, v: string) => void;
}) {
  const input = (k: keyof EnquiryValues, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      id={k}
      value={values[k]}
      aria-invalid={!!errors[k]}
      onChange={(e) => onChange(k, e.target.value)}
      {...props}
    />
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Partner one" icon="user" htmlFor="partner1" error={errors.partner1}>
        {input("partner1", { placeholder: "Meera", autoComplete: "given-name" })}
      </Field>
      <Field label="Partner two" icon="heart" htmlFor="partner2" error={errors.partner2}>
        {input("partner2", { placeholder: "Aarav" })}
      </Field>
      <Field label="Mobile number" icon="phone" htmlFor="phone" error={errors.phone}>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">+91</span>
          {input("phone", { inputMode: "tel", placeholder: "98290 12345", className: "rounded-l-none", autoComplete: "tel-national" })}
        </div>
      </Field>
      <Field label="Email (optional)" icon="mail" htmlFor="email" error={errors.email}>
        {input("email", { type: "email", placeholder: "meera@example.com", autoComplete: "email" })}
      </Field>

      <Field label="City" icon="pin" error={errors.city} className="sm:col-span-2">
        <Chips options={CITIES.map((c) => ({ label: c, value: c }))} value={values.city} onChange={(v) => onChange("city", v)} sound={sound} />
      </Field>

      <Field label="Rough wedding date" icon="calendar" htmlFor="roughDate" error={errors.roughDate}>
        {input("roughDate", { type: "date", min: new Date().toISOString().slice(0, 10) })}
      </Field>
      <Field label="Expected guests" icon="guests" htmlFor="guestCount" error={errors.guestCount}>
        {input("guestCount", { type: "number", inputMode: "numeric", min: 1, max: 5000, placeholder: "400" })}
      </Field>

      <Field label="Theme in mind" icon="palette" error={errors.theme} className="sm:col-span-2">
        <Chips options={THEMES.map((t) => ({ label: t, value: t }))} value={values.theme} onChange={(v) => onChange("theme", v)} sound={sound} />
      </Field>

      <Field label="Maximum budget" icon="wallet" error={errors.maxBudget} className="sm:col-span-2">
        <Chips options={BUDGETS} value={values.maxBudget} onChange={(v) => onChange("maxBudget", v)} sound={sound} />
      </Field>

      <Field label="Anything else?" icon="notes" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
        <Textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Three-day winter wedding, regional food, sunset pheras…"
        />
      </Field>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
  sound,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  sound?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (sound) cue("select");
              onChange(on ? "" : o.value);
            }}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-[color,background-color,border-color,transform] duration-200 active:scale-95",
              on ? "border-maroon bg-maroon text-primary-foreground" : "bg-card hover:border-maroon/40 hover:bg-maroon-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
