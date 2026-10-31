import type { Prisma } from "@prisma/client";
import { addDays } from "./weddings";

type Tx = Prisma.TransactionClient;

// Default event days relative to the first wedding day (3-day wedding).
const DEFAULT_EVENTS = [
  { name: "Mehendi", day: 0, hour: 16 },
  { name: "Haldi", day: 1, hour: 10 },
  { name: "Sangeet", day: 1, hour: 19 },
  { name: "Wedding", day: 2, hour: 18 },
  { name: "Reception", day: 2, hour: 22 },
];

/**
 * Builds the wedding plan from the package template: one Task per template row with
 * dueDate = startDate + offsetDays, owner = lead planner (or the founder for founder tasks),
 * plus the default event days if none exist. Safe to call twice — it skips if tasks already exist.
 */
export async function generatePlan(tx: Tx, weddingId: string) {
  const wedding = await tx.wedding.findUniqueOrThrow({
    where: { id: weddingId },
    include: { package: { include: { templates: { orderBy: { sortOrder: "asc" } } } }, _count: { select: { tasks: true, events: true } } },
  });
  if (wedding._count.tasks > 0) return { created: 0 };

  const founder = await tx.user.findFirst({ where: { role: "FOUNDER" }, select: { id: true } });
  const today = new Date(new Date().toDateString());

  await tx.task.createMany({
    data: wedding.package.templates.map((t) => {
      // Tasks whose ideal date has already passed are due today instead of "overdue on day one".
      const due = addDays(wedding.startDate, t.offsetDays);
      return {
        weddingId,
        templateId: t.id,
        title: t.title,
        event: t.event,
        dueDate: due < today ? today : due,
        ownerId: t.defaultRole === "FOUNDER" ? founder?.id : wedding.leadPlannerId,
        sortOrder: t.sortOrder,
      };
    }),
  });

  if (wedding._count.events === 0) {
    await tx.weddingEvent.createMany({
      data: DEFAULT_EVENTS.map((e, i) => {
        const d = addDays(wedding.startDate, e.day);
        d.setHours(e.hour, 0, 0, 0);
        return { weddingId, name: e.name, startsAt: d, venue: wedding.venue, sortOrder: i };
      }),
    });
  }

  return { created: wedding.package.templates.length };
}
