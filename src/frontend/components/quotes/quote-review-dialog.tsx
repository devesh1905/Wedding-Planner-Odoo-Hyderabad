"use client";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/frontend/lib/api-client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/frontend/components/ui/dialog";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/frontend/components/ui/table";
import { quoteReviewSchema, quoteLineCategories } from "@/shared/schemas/quotes";
import type { QuoteRequestView, PortalQuote } from "@/shared/schemas/quotes-types";

type Quote = QuoteRequestView["quotes"][number];
type Values = z.input<typeof quoteReviewSchema>;
const emptyLine = () => ({ item: "", category: "MAIN" as const, qty: null, unit: null, unitPrice: null, included: true });
function valuesFor(quote: Pick<Quote, "perPlate" | "extraHourRate" | "total" | "notes" | "lines">): Values {
  return {
    perPlate: quote.perPlate,
    extraHourRate: quote.extraHourRate,
    total: quote.total ?? 0,
    notes: quote.notes ?? "",
    lines: quote.lines.length
      ? quote.lines.map((l) => ({ item: l.item, category: l.category, qty: l.qty, unit: l.unit, unitPrice: l.unitPrice, included: l.included }))
      : [emptyLine()],
  };
}
const optionalNumber = (value: string) => (value === "" ? null : Number(value));
// Share a pending read across remounts so the same proposal is not parsed twice.
const reads = new Map<string, Promise<{ quote: PortalQuote }>>();
function readPdf(quote: Quote) {
  const key = `${quote.id}:${quote.updatedAt ?? ""}`;
  let request = reads.get(key);
  if (!request) {
    request = api<{ quote: PortalQuote }>(`/api/quotes/${quote.id}/extract`, {
      method: "POST",
      body: quote.updatedAt ? { updatedAt: quote.updatedAt } : {},
    }).finally(() => reads.delete(key));
    reads.set(key, request);
  }
  return request;
}
export function QuoteReviewDialog({
  quote,
  extractOnOpen,
  onClose,
  onSaved,
}: {
  quote: Quote;
  extractOnOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reading, setReading] = useState(extractOnOpen);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(quote.updatedAt);
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(quoteReviewSchema), defaultValues: valuesFor(quote) });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  useEffect(() => {
    if (!extractOnOpen) return;
    let active = true;
    void readPdf(quote)
      .then((result) => {
        if (active) {
          reset(valuesFor(result.quote));
          setVersion(result.quote.updatedAt);
        }
      })
      .catch((problem) => {
        if (active) setError(problem instanceof Error ? problem.message : "PDF reading failed. Enter the details below.");
      })
      .finally(() => {
        if (active) setReading(false);
      });
    return () => {
      active = false;
    };
  }, [extractOnOpen, quote, reset]);
  const save = handleSubmit(async (values) => {
    setError("");
    try {
      await api(`/api/quotes/${quote.id}/review`, { method: "PATCH", body: { ...values, ...(version ? { expectedUpdatedAt: version } : {}) } });
      toast.success("Proposal reviewed and saved");
      onSaved();
      onClose();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unable to save review");
      if (problem instanceof ApiError) for (const [key, message] of Object.entries(problem.fields ?? {})) fieldError(key as keyof Values, { message });
    }
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting && !reading) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review {quote.vendor.name}</DialogTitle>
          <DialogDescription>Check the original PDF, prices, taxes and exclusions. Your confirmation makes this proposal ready to award.</DialogDescription>
        </DialogHeader>
        {reading ? (
          <div role="status" className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
            <LoaderCircle className="size-8 animate-spin text-primary" />
            <p className="font-medium">Reading menu, prices and conditions…</p>
            <p className="text-sm text-muted-foreground">Preparing an editable proposal. You’ll review every detail before saving.</p>
          </div>
        ) : (
          <form className="space-y-5" noValidate onSubmit={save}>
            {error && (
              <p role="alert" className="rounded-lg bg-rose-soft p-3 text-sm text-rose">
                {error}
              </p>
            )}
            {quote.hasFile && (
              <a className="inline-block text-sm text-primary underline" href={`/api/quotes/${quote.token}/file`} target="_blank" rel="noreferrer">
                Open original PDF
              </a>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="review-perplate">Per plate (₹)</Label>
                <Input id="review-perplate" type="number" min={0} step={1} {...register("perPlate", { setValueAs: optionalNumber })} />
                {errors.perPlate && <p className="text-xs text-destructive">{errors.perPlate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-hour">Extra hour (₹)</Label>
                <Input id="review-hour" type="number" min={0} step={1} {...register("extraHourRate", { setValueAs: optionalNumber })} />
                {errors.extraHourRate && <p className="text-xs text-destructive">{errors.extraHourRate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-total">Grand total (₹)</Label>
                <Input id="review-total" type="number" min={1} step={1} {...register("total", { valueAsNumber: true })} />
                {errors.total && <p className="text-xs text-destructive">{errors.total.message}</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Blank prices stay unknown. Bundled inclusions do not need a separate unit price.</p>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit price (₹)</TableHead>
                    <TableHead>Included</TableHead>
                    <TableHead>
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="min-w-48">
                        <Input aria-label={`Item ${index + 1}`} {...register(`lines.${index}.item`)} />
                        {errors.lines?.[index]?.item && <p className="text-xs text-destructive">{errors.lines[index]?.item?.message}</p>}
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Category ${index + 1}`}
                          className="h-10 rounded-md border bg-background px-2 text-sm"
                          {...register(`lines.${index}.category`)}
                        >
                          {quoteLineCategories.map((category) => (
                            <option key={category} value={category}>
                              {category.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Quantity ${index + 1}`}
                          className="w-24"
                          type="number"
                          min={1}
                          step="any"
                          {...register(`lines.${index}.qty`, { setValueAs: optionalNumber })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Unit ${index + 1}`}
                          className="w-24"
                          {...register(`lines.${index}.unit`, { setValueAs: (value) => value || null })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Unit price ${index + 1}`}
                          className="w-28"
                          type="number"
                          min={0}
                          step={1}
                          {...register(`lines.${index}.unitPrice`, { setValueAs: optionalNumber })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          aria-label={`Included ${index + 1}`}
                          className="size-4 accent-primary"
                          type="checkbox"
                          {...register(`lines.${index}.included`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${index + 1}`} onClick={() => remove(index)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.lines && <p className="text-sm text-destructive">Check the line items. Use a description, positive quantities and whole rupee prices.</p>}
            <Button type="button" variant="outline" onClick={() => append(emptyLine())} disabled={fields.length >= 100}>
              <Plus className="size-4" />
              Add line
            </Button>
            <div className="space-y-2">
              <Label htmlFor="review-notes">Taxes, exclusions and conditions</Label>
              <Textarea id="review-notes" rows={3} {...register("notes")} />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                Review later
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Confirm reviewed proposal"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
