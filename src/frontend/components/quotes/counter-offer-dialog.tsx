"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { api } from "@/frontend/lib/api-client";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { WhatsAppLink } from "@/frontend/components/common/whatsapp-link";

type Draft = { message: string; source: "ai" | "template"; leveragePoints: string[]; vendor: { name: string; phone: string } };

/** Suggested counter-offer for a vendor that is not the best value; the planner edits before sending. */
export function CounterOfferDialog({
  requestId,
  quoteId,
  vendorName,
  onClose,
}: {
  requestId: string;
  quoteId: string;
  vendorName: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api<Draft>(`/api/quote-requests/${requestId}/counter-offer`, { method: "POST", body: { quoteId } })
      .then((d) => {
        if (live) {
          setDraft(d);
          setText(d.message);
        }
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Could not draft a message");
      });
    return () => {
      live = false;
    };
  }, [requestId, quoteId, attempt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy is not available here. Select the text and copy it manually.");
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Counter-offer to {vendorName}</DialogTitle>
          <DialogDescription>A suggested WhatsApp message. Check the points below, edit the text, then send.</DialogDescription>
        </DialogHeader>
        {error && !draft ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : !draft ? (
          <div className="space-y-3" aria-busy="true">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Drafting message…
            </p>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Leverage points</p>
              {draft.leveragePoints.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {draft.leveragePoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No clear differences found in the stored quotes.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="counter-offer-text" className="text-sm font-medium">
                  Message
                </label>
                <Badge variant="outline">{draft.source === "template" ? "Template" : "Draft"}</Badge>
              </div>
              <Textarea id="counter-offer-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => void copy()}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <WhatsAppLink phone={draft.vendor.phone} path="" message={text} bare label="Send on WhatsApp" className="h-8 px-3" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
