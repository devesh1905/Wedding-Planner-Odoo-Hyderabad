"use client";

import { useState } from "react";
import { Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/common/field";
import { api } from "@/lib/api-client";

export function ShareDialog() {
  const [days, setDays] = useState("7");
  const [link, setLink] = useState("");
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    try {
      const r = await api<{ token: string }>("/api/share-links", { method: "POST", body: { days: Number(days) } });
      setLink(`${window.location.origin}/share/${r.token}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create link");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={(o) => !o && setLink("")}>
      <DialogTrigger asChild>
        <Button>
          <Share2 /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Share these numbers</DialogTitle>
          <DialogDescription>Creates a read-only link — no login needed, nothing can be edited.</DialogDescription>
        </DialogHeader>
        {!link ? (
          <div className="space-y-4">
            <Field label="Link expires after">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={create} disabled={pending} className="w-full">
              {pending && <Loader2 className="animate-spin" />} Create link
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input readOnly value={link} className="text-xs" />
            <Button
              size="icon"
              variant="outline"
              aria-label="Copy"
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("Link copied");
              }}
            >
              <Copy />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
