"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/common/field";
import { Amount } from "@/components/common/amount";
import { OwnerAvatar } from "@/components/common/owner-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatINR } from "@/lib/format";

type User = { id: string; name: string; avatarColor: string | null; hourlyCost: number };
type Log = { id: string; date: string | Date; hours: number; note: string | null; user: User };

export function HoursTab({ weddingId, logs, users, currentUserId }: { weddingId: string; logs: Log[]; users: User[]; currentUserId: string }) {
  const router = useRouter();
  const [v, setV] = useState({ userId: currentUserId, date: new Date().toISOString().slice(0, 10), hours: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const totalCost = Math.round(logs.reduce((s, l) => s + l.hours * l.user.hourlyCost, 0));
  const byPerson = users
    .map((u) => {
      const mine = logs.filter((l) => l.user.id === u.id);
      return { ...u, hours: mine.reduce((s, l) => s + l.hours, 0) };
    })
    .filter((u) => u.hours > 0)
    .sort((a, b) => b.hours - a.hours);
  const selected = users.find((u) => u.id === v.userId);
  const preview = selected && Number(v.hours) > 0 ? Math.round(Number(v.hours) * selected.hourlyCost) : 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api(`/api/weddings/${weddingId}/time-logs`, { method: "POST", body: v });
      toast.success(`${v.hours} h logged`);
      setV((s) => ({ ...s, hours: "", note: "" }));
      setErrors({});
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api(`/api/time-logs/${id}`, { method: "DELETE" });
      toast.success("Entry removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Planning hours</p>
            <p className="mt-1 font-serif text-3xl font-semibold tabular">{totalHours.toLocaleString("en-IN", { maximumFractionDigits: 1 })} h</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Team cost (used in profit)</p>
            <Amount rupees={totalCost} className="mt-1 block font-serif text-3xl font-semibold" />
          </div>
        </div>

        {logs.length === 0 ? (
          <EmptyState icon={Clock} title="No hours logged yet" hint="Log planning hours so the founder sees the real profit on this wedding." />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Who</th>
                    <th className="p-3 font-medium">Note</th>
                    <th className="p-3 text-right font-medium">Hours</th>
                    <th className="p-3 text-right font-medium">Cost</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-3 tabular">{formatDate(l.date)}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          <OwnerAvatar name={l.user.name} color={l.user.avatarColor} size="xs" /> {l.user.name}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{l.note ?? "—"}</td>
                      <td className="p-3 text-right tabular">{l.hours}</td>
                      <td className="p-3 text-right">
                        <Amount rupees={Math.round(l.hours * l.user.hourlyCost)} />
                      </td>
                      <td className="p-3 text-right">
                        <Button size="icon" variant="ghost" aria-label="Remove entry" disabled={deleting === l.id} onClick={() => remove(l.id)}>
                          {deleting === l.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <form onSubmit={add} noValidate className="space-y-4 rounded-2xl border bg-card p-5">
          <h3 className="text-xl font-semibold">Log hours</h3>
          <Field label="Team member" error={errors.userId}>
            <Select value={v.userId} onValueChange={(userId) => setV({ ...v, userId })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} · {formatINR(u.hourlyCost)}/h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" error={errors.date}>
              <Input type="date" value={v.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setV({ ...v, date: e.target.value })} />
            </Field>
            <Field label="Hours" error={errors.hours}>
              <Input type="number" inputMode="decimal" step="0.5" min="0.5" max="24" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value })} placeholder="3.5" />
            </Field>
          </div>
          <Field label="What was done" error={errors.note}>
            <Input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Venue walkthrough with family" />
          </Field>
          {preview > 0 && <p className="text-sm text-muted-foreground">Adds {formatINR(preview)} to this wedding's cost</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Log hours
          </Button>
        </form>

        {byPerson.length > 0 && (
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-xl font-semibold">By person</h3>
            <ul className="space-y-2 text-sm">
              {byPerson.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <OwnerAvatar name={u.name} color={u.avatarColor} size="xs" />
                  <span className="flex-1">{u.name}</span>
                  <span className="tabular">{u.hours.toLocaleString("en-IN", { maximumFractionDigits: 1 })} h</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
