"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Icon, type IconName } from "@/frontend/components/icons/icon";
import { ListChecks, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select";
import { OwnerAvatar } from "@/frontend/components/common/owner-avatar";
import { EmptyState } from "@/frontend/components/common/empty-state";
import { statusLabel } from "@/frontend/components/common/stage-pill";
import { api } from "@/frontend/lib/api-client";
import { formatDate } from "@/shared/format";
import { cn } from "@/shared/utils";

type User = { id: string; name: string; avatarColor: string | null };
type Task = {
  id: string;
  title: string;
  event: string;
  stage: string;
  dueDate: string | Date | null;
  owner: User | null;
};

const STAGE_ICON: Record<string, IconName> = { TO_PLAN: "planner", IN_PROGRESS: "route", WAITING: "clock", DONE: "check" };
const STAGES = ["TO_PLAN", "IN_PROGRESS", "WAITING", "DONE"] as const;
const EVENT_LABEL: Record<string, string> = {
  VENUE: "Venue & guests",
  DESIGN: "Design",
  VENDORS: "Vendors",
  MEHENDI: "Mehendi",
  HALDI: "Haldi",
  SANGEET: "Sangeet",
  WEDDING: "Wedding",
  RECEPTION: "Reception",
  WRAP_UP: "Wrap-up",
};
const EVENT_TONE: Record<string, string> = {
  VENUE: "bg-sky-soft text-sky",
  DESIGN: "bg-maroon-soft text-maroon",
  VENDORS: "bg-marigold-soft text-[oklch(0.45_0.1_60)]",
  MEHENDI: "bg-teal-soft text-teal",
  HALDI: "bg-marigold-soft text-[oklch(0.45_0.1_60)]",
  SANGEET: "bg-sky-soft text-sky",
  WEDDING: "bg-rose-soft text-rose",
  RECEPTION: "bg-maroon-soft text-maroon",
  WRAP_UP: "bg-muted text-muted-foreground",
};

const isOverdue = (t: Task) => t.stage !== "DONE" && t.dueDate != null && new Date(t.dueDate) < new Date(new Date().toDateString());

export function PlanTab({ weddingId, tasks, users, hasPlan }: { weddingId: string; tasks: Task[]; users: User[]; hasPlan: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [prev, setPrev] = useState(tasks);
  if (prev !== tasks) {
    setPrev(tasks);
    setItems(tasks);
  }
  const [event, setEvent] = useState("ALL");
  const [owner, setOwner] = useState("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [dragging, setDragging] = useState<Task | null>(null);
  const [generating, setGenerating] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const visible = useMemo(
    () =>
      items.filter(
        (t) => (event === "ALL" || t.event === event) && (owner === "ALL" || t.owner?.id === owner) && (!onlyOverdue || isOverdue(t)),
      ),
    [items, event, owner, onlyOverdue],
  );
  const overdueCount = items.filter(isOverdue).length;
  const done = items.filter((t) => t.stage === "DONE").length;

  async function generate() {
    setGenerating(true);
    try {
      const r = await api<{ created: number }>(`/api/weddings/${weddingId}/generate-plan`, { method: "POST" });
      toast.success(`${r.created} tasks created from the package template`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  async function update(id: string, body: Record<string, unknown>, rollback: Task) {
    try {
      await api(`/api/tasks/${id}`, { method: "PATCH", body });
      router.refresh();
    } catch (e) {
      setItems((s) => s.map((t) => (t.id === id ? rollback : t)));
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  function onDragEnd(ev: DragEndEvent) {
    setDragging(null);
    const t = items.find((x) => x.id === ev.active.id);
    const to = ev.over?.id as string | undefined;
    if (!t || !to || t.stage === to) return;
    setItems((s) => s.map((x) => (x.id === t.id ? { ...x, stage: to } : x)));
    if (to === "DONE") toast.success(`Done: ${t.title}`);
    update(t.id, { stage: to }, t);
  }

  function reassign(t: Task, userId: string) {
    const u = users.find((x) => x.id === userId) ?? null;
    setItems((s) => s.map((x) => (x.id === t.id ? { ...x, owner: u } : x)));
    update(t.id, { ownerId: userId }, t);
  }

  if (!hasPlan) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No plan yet"
        hint="The plan is created automatically when the booking payment is recorded. You can also generate it now from the package template."
        action={
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate plan
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon name="checklist" className="size-4" />
          <span>
          <b className="text-foreground tabular">
            {done}/{items.length}
          </b>{" "}
          tasks done
          {overdueCount > 0 && <span className="ml-2 font-medium text-rose">· {overdueCount} overdue</span>}
          </span>
        </p>
        <Select value={event} onValueChange={setEvent}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            {Object.entries(EVENT_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Everyone</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={onlyOverdue ? "default" : "outline"} size="sm" onClick={() => setOnlyOverdue((v) => !v)}>
          Overdue only
        </Button>
        <AddTask weddingId={weddingId} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragging(items.find((t) => t.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s) => (
            <Column key={s} stage={s} tasks={visible.filter((t) => t.stage === s)} users={users} onReassign={reassign} />
          ))}
        </div>
        <DragOverlay>{dragging && <TaskCard t={dragging} users={users} overlay />}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ stage, tasks, users, onReassign }: { stage: string; tasks: Task[]; users: User[]; onReassign: (t: Task, u: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} className={cn("rounded-2xl bg-muted/60 p-2 transition-colors", isOver && "bg-marigold-soft ring-2 ring-marigold/50")}>
      <header className="flex items-center justify-between px-2 py-2">
        <h3 className="flex items-center gap-1.5 font-sans text-sm font-semibold">
          <Icon name={STAGE_ICON[stage] ?? "checklist"} className="size-3.5" /> {statusLabel(stage)}
        </h3>
        <span className="rounded-full bg-background px-2 text-xs text-muted-foreground tabular">{tasks.length}</span>
      </header>
      <div className="flex min-h-20 flex-col gap-2">
        {tasks.map((t) => (
          <Draggable key={t.id} t={t} users={users} onReassign={onReassign} />
        ))}
      </div>
    </section>
  );
}

function Draggable({ t, users, onReassign }: { t: Task; users: User[]; onReassign: (t: Task, u: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-30")}>
      <TaskCard t={t} users={users} onReassign={onReassign} />
    </div>
  );
}

function TaskCard({ t, users, onReassign, overlay }: { t: Task; users: User[]; onReassign?: (t: Task, u: string) => void; overlay?: boolean }) {
  const late = isOverdue(t);
  return (
    <article className={cn("rounded-xl border bg-card p-3 shadow-xs", overlay && "rotate-1 shadow-lg", t.stage === "DONE" && "opacity-70")}>
      <p className={cn("text-sm leading-snug font-medium", t.stage === "DONE" && "line-through decoration-muted-foreground/50")}>{t.title}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", EVENT_TONE[t.event] ?? "bg-muted")}>{EVENT_LABEL[t.event] ?? t.event}</span>
        {t.dueDate && <span className={cn("text-xs tabular", late ? "font-medium text-rose" : "text-muted-foreground")}>{formatDate(t.dueDate).slice(0, 6)}</span>}
        <span className="ml-auto" onPointerDown={(e) => e.stopPropagation()}>
          {onReassign ? (
            <Select value={t.owner?.id ?? ""} onValueChange={(v) => onReassign(t, v)}>
              <SelectTrigger className="h-auto border-0 p-0 shadow-none [&>svg]:hidden" aria-label="Change owner">
                <OwnerAvatar name={t.owner?.name} color={t.owner?.avatarColor} size="xs" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <OwnerAvatar name={t.owner?.name} color={t.owner?.avatarColor} size="xs" />
          )}
        </span>
      </div>
    </article>
  );
}

function AddTask({ weddingId }: { weddingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [event, setEvent] = useState("VENDORS");
  const [pending, setPending] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api(`/api/weddings/${weddingId}/tasks`, { method: "POST", body: { title, event } });
      setTitle("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    } finally {
      setPending(false);
    }
  }

  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Task
      </Button>
    );
  return (
    <form onSubmit={add} className="flex w-full items-center gap-2 sm:w-auto">
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task" className="h-8 sm:w-56" />
      <Select value={event} onValueChange={setEvent}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(EVENT_LABEL).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" type="submit" disabled={pending || title.trim().length < 3}>
        Add
      </Button>
    </form>
  );
}
