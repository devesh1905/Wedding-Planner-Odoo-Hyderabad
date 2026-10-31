"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cue } from "@/lib/sound";

export function ApproveAddons({ token, milestoneId }: { token: string; milestoneId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function approve() {
    setPending(true);
    setError(undefined);
    try {
      await api(`/api/public/portal/${token}/approve`, { method: "POST", body: { milestoneId } });
      cue("success", "normal");
      router.refresh();
    } catch (e) {
      cue("error");
      setError(e instanceof Error ? e.message : "Could not approve");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <Button className="squircle h-12 w-full rounded-xl text-base" size="lg" onClick={approve} disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="animate-spin" />} {pending ? "Approving…" : "Approve add-ons"}
      </Button>
      {error && <p role="alert" className="text-center text-sm text-rose">{error}</p>}
    </div>
  );
}
