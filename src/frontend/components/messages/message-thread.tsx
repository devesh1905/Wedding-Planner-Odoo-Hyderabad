"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { Icon } from "@/frontend/components/icons/icon";
import { api } from "@/frontend/lib/api-client";
import { formatDateTime } from "@/shared/format";
import { cn } from "@/shared/utils";
import type { MessageRow } from "@/shared/schemas/messages";

type Side = "COUPLE" | "STAFF";

/** "just now" / "5 min ago" / "2 h ago", then a full date for anything older than a day. */
function timeAgo(d: string) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return formatDateTime(d);
}

export function MessageThread({ endpoint, me, names, pollMs = 15000 }: { endpoint: string; me: Side; names?: string[]; pollMs?: number }) {
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sender, setSender] = useState(names?.[0] ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  // Messages from the other side that were unread when this thread opened keep a "New" tag
  // until the reader leaves, even though the server marks them read on that first fetch.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    try {
      const rows = await api<MessageRow[]>(endpoint);
      // Keep optimistic (not yet saved) bubbles from disappearing during a poll.
      setMessages((prev) => [...rows, ...(prev ?? []).filter((m) => m.id.startsWith("tmp-"))]);
      const unread = rows.filter((m) => m.author !== me && !m.readAt).map((m) => m.id);
      if (unread.length) setFresh((prev) => new Set([...prev, ...unread]));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [endpoint, me]);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  // Scroll to the newest message when the count changes.
  const count = messages?.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    const tmp: MessageRow = {
      id: `tmp-${Date.now()}`,
      author: me,
      authorName: me === "COUPLE" ? sender || "You" : "You",
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...(prev ?? []), tmp]);
    setText("");
    setSending(true);
    try {
      const saved = await api<MessageRow>(endpoint, { method: "POST", body: me === "COUPLE" ? { body, name: sender || undefined } : { body } });
      setMessages((prev) => (prev ?? []).map((m) => (m.id === tmp.id ? saved : m)));
    } catch (e) {
      setMessages((prev) => (prev ?? []).filter((m) => m.id !== tmp.id));
      setText(body);
      toast.error(e instanceof Error ? e.message : "Could not send the message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div ref={listRef} className="max-h-80 min-h-32 space-y-3 overflow-y-auto rounded-xl bg-muted/30 p-3" aria-live="polite">
        {messages === null && !failed ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </div>
        ) : messages === null ? (
          <p className="py-6 text-center text-sm text-rose">
            Could not load messages.{" "}
            <button type="button" onClick={load} className="underline">
              Try again
            </button>
          </p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {me === "COUPLE" ? "No messages yet — ask anything about your wedding." : "No messages from the couple yet."}
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.author === me;
            const firstNew = fresh.has(m.id) && !messages.slice(0, i).some((p) => fresh.has(p.id));
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                {firstNew && (
                  <div className="mb-2 flex w-full items-center gap-2 text-[11px] font-semibold tracking-wider text-rose uppercase">
                    <span className="h-px flex-1 bg-rose/30" />
                    New
                    <span className="h-px flex-1 bg-rose/30" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-cta text-cta-foreground" : "bg-muted",
                    m.id.startsWith("tmp-") && "opacity-60",
                  )}
                >
                  {m.body}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-muted-foreground">
                  {mine ? "" : `${m.authorName} · `}
                  {timeAgo(m.createdAt)}
                  {mine && !m.id.startsWith("tmp-") && (m.readAt ? " · Seen" : " · Sent")}
                </span>
              </div>
            );
          })
        )}
      </div>

      {me === "COUPLE" && names && names.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Writing as
          {names.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSender(n)}
              aria-pressed={sender === n}
              className={cn("min-h-11 rounded-full border px-4 text-sm transition-colors", sender === n ? "border-cta bg-cta text-cta-foreground" : "bg-card text-foreground hover:bg-muted")}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={1000}
          rows={2}
          placeholder="Write a message…"
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none"
        />
        <Button type="button" onClick={send} disabled={sending || !text.trim()} className="min-h-11 min-w-11" aria-label="Send message">
          <Send className="size-4" /> <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <Icon name="chat" className="size-4" /> {title}
      </h3>
      {children}
    </section>
  );
}

/** Couple portal (no login): the token in the URL identifies the wedding. */
export function CouplePortalMessages({ token, names }: { token: string; names?: string[] }) {
  return (
    <SectionCard title="Message your planner">
      <MessageThread endpoint={`/api/public/portal/${token}/messages`} me="COUPLE" names={names} />
    </SectionCard>
  );
}

/** Staff side, shown on the wedding Overview tab. */
export function WeddingMessages({ weddingId }: { weddingId: string }) {
  return (
    <SectionCard title="Messages from the couple">
      <MessageThread endpoint={`/api/weddings/${weddingId}/messages`} me="STAFF" />
    </SectionCard>
  );
}
