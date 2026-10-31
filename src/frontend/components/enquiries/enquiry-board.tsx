"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollRail } from "@/frontend/components/common/scroll-rail";
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
import { AlertTriangle, AtSign, Globe, Inbox, MessageCircle, Phone, Search, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/frontend/components/ui/input";
import { OwnerAvatar } from "@/frontend/components/common/owner-avatar";
import { statusLabel } from "@/frontend/components/common/stage-pill";
import { EmptyState } from "@/frontend/components/common/empty-state";
import { formatDate, formatINRCompact } from "@/shared/format";
import { api } from "@/frontend/lib/api-client";
import { cn } from "@/shared/utils";
import { STATUSES } from "@/shared/validation/enquiry";
import { EnquiryDrawer } from "./enquiry-drawer";
import { needsFollowUp, type EnquiryCardData, type Planner } from "./types";

const COLUMN_ACCENT: Record<string, string> = {
  NEW: "bg-maroon",
  CONTACTED: "bg-sky",
  MEETING_BOOKED: "bg-sky",
  AGREEMENT_SENT: "bg-marigold",
  SIGNED: "bg-teal",
  LOST: "bg-muted-foreground/40",
};

const SOURCE_ICON: Record<string, React.ElementType> = {
  WEB_FORM: Globe,
  PHONE: Phone,
  INSTAGRAM: AtSign,
  WHATSAPP: MessageCircle,
  REFERRAL: UserPlus,
  WALK_IN: Users,
};

export function EnquiryBoard({ enquiries, planners }: { enquiries: EnquiryCardData[]; planners: Planner[] }) {
  const router = useRouter();
  const [items, setItems] = useState(enquiries);
  const [query, setQuery] = useState("");
  // `?open=<id>` (from global search) opens that enquiry straight away
  const [openId, setOpenId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const openParam = useSearchParams().get("open");
  useEffect(() => {
    if (openParam) setOpenId(openParam);
  }, [openParam]);
  const [dragging, setDragging] = useState<EnquiryCardData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  // Keep local state in sync when the server sends fresh data (after router.refresh()).
  const [prev, setPrev] = useState(enquiries);
  if (prev !== enquiries) {
    setPrev(enquiries);
    setItems(enquiries);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => `${e.partner1} ${e.partner2} ${e.phone} ${e.city ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  async function onDragEnd(ev: DragEndEvent) {
    setDragging(null);
    const id = String(ev.active.id);
    const to = ev.over?.id as string | undefined;
    const card = items.find((e) => e.id === id);
    if (!card || !to || card.status === to) return;
    if (to === "SIGNED") return void toast.info("Cards move to Signed when the couple signs the agreement");
    if (card.status === "SIGNED") return void toast.info("Signed enquiries can't be moved back");

    // Optimistic move, rolled back if the server refuses.
    setItems((s) => s.map((e) => (e.id === id ? { ...e, status: to, updatedAt: new Date().toISOString() } : e)));
    try {
      await api(`/api/enquiries/${id}`, { method: "PATCH", body: { status: to } });
      toast.success(`Moved to ${statusLabel(to)}`);
      router.refresh();
    } catch (err) {
      setItems((s) => s.map((e) => (e.id === id ? card : e)));
      toast.error(err instanceof Error ? err.message : "Could not move");
    }
  }

  if (items.length === 0) {
    return <EmptyState icon={Inbox} title="No enquiries yet" hint="Share the enquiry form link or add one from a call." />;
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, city" className="pl-9" />
        </div>
        <ScrollRail target={boardRef} className="ml-auto" />
      </div>

      <DndContext id="enquiry-board"
        sensors={sensors}
        onDragStart={(e) => setDragging(items.find((i) => i.id === e.active.id) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div ref={boardRef} className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          {STATUSES.map((s) => (
            <Column key={s} status={s} items={filtered.filter((e) => e.status === s)} onOpen={setOpenId} />
          ))}
        </div>
        <DragOverlay>{dragging && <Card e={dragging} overlay />}</DragOverlay>
      </DndContext>

      <EnquiryDrawer id={openId} planners={planners} onClose={() => setOpenId(null)} />
    </>
  );
}

function Column({ status, items, onOpen }: { status: string; items: EnquiryCardData[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn("flex w-72 shrink-0 flex-col rounded-2xl bg-muted/60 p-2 transition-colors", isOver && "bg-marigold-soft ring-2 ring-marigold/50")}
    >
      <header className="flex items-center gap-2 px-2 py-2">
        <span className={cn("size-2 rounded-full", COLUMN_ACCENT[status])} />
        <h2 className="font-sans text-sm font-semibold">{statusLabel(status)}</h2>
        <span className="ml-auto rounded-full bg-background px-2 text-xs text-muted-foreground tabular">{items.length}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Nothing here yet</p>
        )}
        {items.map((e) => (
          <DraggableCard key={e.id} e={e} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function DraggableCard({ e, onOpen }: { e: EnquiryCardData; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: e.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-30")}>
      <Card e={e} onClick={() => onOpen(e.id)} />
    </div>
  );
}

function Card({ e, onClick, overlay }: { e: EnquiryCardData; onClick?: () => void; overlay?: boolean }) {
  const Icon = SOURCE_ICON[e.source] ?? Globe;
  const warn = needsFollowUp(e);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-left shadow-xs transition hover:border-maroon/30 hover:shadow-sm",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 font-serif text-lg leading-tight font-semibold">
          {e.partner1} & {e.partner2}
        </p>
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={e.source} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {[e.roughDate && formatDate(e.roughDate), e.city].filter(Boolean).join(" · ") || "Date & city to confirm"}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {e.guestCount != null && <span className="rounded-md bg-muted px-1.5 py-0.5 tabular">{e.guestCount} guests</span>}
        {e.maxBudget != null && <span className="rounded-md bg-marigold-soft px-1.5 py-0.5 tabular">≤ {formatINRCompact(e.maxBudget)}</span>}
        <span className="ml-auto">
          <OwnerAvatar name={e.assignedTo?.name} color={e.assignedTo?.avatarColor} size="xs" />
        </span>
      </div>
      {!!e.services?.length && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-maroon-soft px-2 py-1 text-xs font-medium text-maroon">
          Custom package · {e.services.length} {e.services.length === 1 ? "service" : "services"}
        </p>
      )}
      {e.duplicateOf && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-marigold-soft px-2 py-1 text-xs text-foreground" title="Same mobile number">
          <Phone className="size-3 shrink-0" /> <span className="truncate">Same phone as {e.duplicateOf}</span>
        </p>
      )}
      {warn && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-rose-soft px-2 py-1 text-xs text-rose">
          <AlertTriangle className="size-3" /> Follow-up overdue
        </p>
      )}
    </button>
  );
}
