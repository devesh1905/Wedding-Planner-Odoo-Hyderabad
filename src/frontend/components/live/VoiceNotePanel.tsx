"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, X, Check } from "lucide-react";
import { api, ApiError } from "@/frontend/lib/api-client";
import { Button } from "@/frontend/components/ui/button";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { VOICE_NOTE_MAX_BASE64, VOICE_NOTE_MAX_SECONDS, type VoiceNoteResult, type VoiceProposal } from "@/shared/schemas/voice-note";

type Phase = "idle" | "recording" | "processing" | "review";
const FALLBACK = "You can still log the problem by hand with the form below.";

// Chrome/Android record webm; Safari only supports mp4.
function pickMime(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
}
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the recording"));
    reader.readAsDataURL(blob);
  });
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Hold-to-talk replacement: tap the mic, speak, tap again. Nothing is changed until the planner
 * reviews the proposed actions and presses Apply; Apply goes through the same offline queue as
 * the manual controls, so sync and activity logging behave identically.
 */
export function VoiceNotePanel({ weddingId, online, onApply }: {
  weddingId: string;
  online: boolean;
  onApply: (proposal: VoiceProposal) => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<VoiceNoteResult>();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const cancelled = useRef(false);

  const release = useCallback(() => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => () => { cancelled.current = true; if (recorder.current?.state === "recording") recorder.current.stop(); release(); }, [release]);

  const send = async (blob: Blob, mimeType: string) => {
    setPhase("processing");
    try {
      const data = await toBase64(blob);
      if (data.length > VOICE_NOTE_MAX_BASE64) throw new Error("That recording is too long. Try a shorter note.");
      const res = await api<VoiceNoteResult>(`/api/weddings/${weddingId}/voice-note`, { method: "POST", body: { mimeType, data } });
      if (!res.actions.length) {
        setMessage(res.transcript ? `I heard: "${res.transcript}" but found nothing to change. ${FALLBACK}` : `I could not hear anything. Try again closer to the phone. ${FALLBACK}`);
        setPhase("idle");
        return;
      }
      setResult(res);
      setTicked(new Set(res.actions.map((a) => a.key)));
      setMessage("");
      setPhase("review");
    } catch (problem) {
      const unavailable = problem instanceof ApiError ? problem.status === 503 : !navigator.onLine;
      setMessage(unavailable ? `The voice assistant is not available right now. ${FALLBACK}` : `${problem instanceof Error ? problem.message : "Something went wrong."} ${FALLBACK}`);
      setPhase("idle");
    }
  };

  const start = async () => {
    setMessage("");
    if (!online) { setMessage(`Voice notes need a connection. ${FALLBACK}`); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setMessage(`This browser cannot record audio. ${FALLBACK}`); return; }
    try {
      // The browser asks for microphone permission here, on the first press only.
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const mime = pickMime();
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        release();
        if (cancelled.current) { setPhase("idle"); return; }
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        void send(new Blob(chunks.current, { type }), type);
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setPhase("recording");
      timer.current = window.setInterval(() => setSeconds((s) => {
        if (s + 1 >= VOICE_NOTE_MAX_SECONDS && rec.state === "recording") rec.stop();
        return s + 1;
      }), 1000);
    } catch (problem) {
      release();
      const denied = problem instanceof DOMException && (problem.name === "NotAllowedError" || problem.name === "SecurityError");
      setMessage(denied ? `Microphone access is blocked. Allow it in the browser settings. ${FALLBACK}` : `No microphone was found. ${FALLBACK}`);
      setPhase("idle");
    }
  };
  const stop = () => { if (recorder.current?.state === "recording") recorder.current.stop(); };
  const cancel = () => { cancelled.current = true; if (recorder.current?.state === "recording") recorder.current.stop(); else release(); setPhase("idle"); setMessage(""); };

  const apply = async () => {
    if (!result || applying) return;
    setApplying(true);
    try {
      const chosen = result.actions.filter((a) => ticked.has(a.key));
      for (const proposal of chosen) await onApply(proposal);
      setMessage(`Applied ${chosen.length} ${chosen.length === 1 ? "change" : "changes"}.`);
      setResult(undefined);
      setPhase("idle");
    } catch (problem) {
      setMessage(problem instanceof Error ? problem.message : "Could not apply the changes.");
    } finally { setApplying(false); }
  };
  const toggle = (key: string, on: boolean) => setTicked((prev) => { const next = new Set(prev); if (on) next.add(key); else next.delete(key); return next; });

  return (
    <Card>
      <CardHeader><CardTitle>Voice note</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {phase === "review" && result ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-muted p-3 text-sm italic text-muted-foreground">&ldquo;{result.transcript || "No transcript"}&rdquo;</p>
            <p className="text-sm font-medium">Nothing changes until you press Apply.</p>
            <ul className="space-y-2">
              {result.actions.map((a) => (
                <li key={a.key}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                    <Checkbox className="mt-0.5" checked={ticked.has(a.key)} onCheckedChange={(v) => toggle(a.key, v === true)} aria-label={a.summary} />
                    <span className="min-w-0 break-words">{a.summary}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-11 flex-1" disabled={applying || ticked.size === 0} onClick={() => void apply()}>
                <Check className="size-4" />{applying ? "Applying…" : `Apply ${ticked.size}`}
              </Button>
              <Button className="min-h-11" variant="outline" disabled={applying} onClick={() => { setResult(undefined); setPhase("idle"); }}>Discard</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Say what changed, e.g. &ldquo;push the sangeet entry to 8:40 and tell the decorator the stage lights are flickering&rdquo;.</p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="lg"
                className="min-h-11 flex-1"
                variant={phase === "recording" ? "destructive" : "default"}
                disabled={phase === "processing"}
                aria-pressed={phase === "recording"}
                onClick={() => (phase === "recording" ? stop() : void start())}
              >
                {phase === "processing" ? <Loader2 className="size-4 animate-spin" /> : phase === "recording" ? <Square className="size-4" /> : <Mic className="size-4" />}
                {phase === "processing" ? "Listening to your note…" : phase === "recording" ? "Stop and send" : "Record a voice note"}
              </Button>
              {phase === "recording" && <Button type="button" variant="outline" className="size-11" aria-label="Cancel recording" onClick={cancel}><X className="size-4" /></Button>}
            </div>
            {phase === "recording" && (
              <p role="status" className="flex items-center gap-2 text-sm font-medium text-destructive">
                <span className="size-2 animate-pulse rounded-full bg-destructive" />Recording {clock(seconds)} / {clock(VOICE_NOTE_MAX_SECONDS)}
              </p>
            )}
          </div>
        )}
        {message && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{message}</p>}
      </CardContent>
    </Card>
  );
}
