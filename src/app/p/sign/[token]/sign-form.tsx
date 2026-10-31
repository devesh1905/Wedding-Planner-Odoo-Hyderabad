"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "signature_pad";
import { Eraser, Loader2, PenLine } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Field } from "@/frontend/components/common/field";
import { api, ApiError } from "@/frontend/lib/api-client";
import { cue } from "@/frontend/lib/sound";
import { petalShower } from "@/frontend/components/home/petals";

export function SignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [name, setName] = useState(defaultName);
  const [agree, setAgree] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const pad = new SignaturePad(canvas, { penColor: "#3b0f17", minWidth: 0.8, maxWidth: 2.4 });
    padRef.current = pad;
    // Match the canvas bitmap to its CSS size × device pixel ratio so strokes stay sharp on phones.
    const resize = () => {
      const data = pad.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")!.scale(ratio, ratio);
      pad.clear();
      pad.fromData(data);
    };
    resize();
    window.addEventListener("resize", resize);
    pad.addEventListener("endStroke", () => setHasInk(!pad.isEmpty()));
    return () => {
      window.removeEventListener("resize", resize);
      pad.off();
    };
  }, []);

  function clear() {
    padRef.current?.clear();
    setHasInk(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pad = padRef.current!;
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.signerName = "Type your full name";
    if (pad.isEmpty()) next.signature = "Please sign in the box";
    if (!agree) next.agree = "Please accept the agreement";
    setErrors(next);
    if (Object.keys(next).length) return cue("error");

    setPending(true);
    try {
      await api(`/api/public/agreements/${token}/sign`, {
        method: "POST",
        body: { signerName: name, signature: pad.toDataURL("image/png"), agree },
      });
      cue("success", "strong");
      petalShower("full");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else setErrors({ form: err instanceof Error ? err.message : "Could not sign" });
      cue("error");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="squircle space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <Field label="Your full name" htmlFor="signerName" error={errors.signerName}>
        <Input
          id="signerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          aria-invalid={!!errors.signerName}
          className="h-11 md:h-10"
        />
      </Field>

      <Field label="Sign here" error={errors.signature}>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-maroon/40 bg-white"
            aria-label="Signature box — draw your signature with your finger or mouse"
          />
          {!hasInk && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-stone-500">
              <span className="flex items-center gap-2">
                <PenLine className="size-4" aria-hidden /> Draw your signature
              </span>
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clear}
            className="absolute right-2 bottom-2 h-9 px-3 text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-100"
          >
            <Eraser /> Clear
          </Button>
        </div>
      </Field>

      <label className="flex cursor-pointer items-start gap-3 py-1 text-sm leading-relaxed">
        <Checkbox
          checked={agree}
          onCheckedChange={(v) => {
            cue("toggle");
            setAgree(v === true);
          }}
          className="mt-0.5 size-5"
        />
        <span>
          I have read and accept this service agreement.
          {errors.agree && (
            <span role="alert" className="mt-1 block text-xs text-rose">
              {errors.agree}
            </span>
          )}
        </span>
      </label>

      {errors.form && (
        <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2.5 text-sm text-rose">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" className="squircle h-12 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
        {pending && <Loader2 className="animate-spin" />} {pending ? "Signing…" : "Sign agreement"}
      </Button>
    </form>
  );
}
