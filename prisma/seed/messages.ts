import type { PrismaClient } from "@prisma/client";

// A short demo thread on the first wedding (Aarav & Meera) so the message cards are not empty.
export async function seedMessages(db: PrismaClient) {
  const wedding = await db.wedding.findUnique({ where: { code: "TRK-2627-001" }, include: { leadPlanner: true } });
  if (!wedding || (await db.message.count({ where: { weddingId: wedding.id } })) > 0) return;
  const couple = `${wedding.partner1} & ${wedding.partner2}`;
  const mins = (m: number) => new Date(Date.now() - m * 60_000);
  await db.message.createMany({
    data: [
      {
        weddingId: wedding.id,
        author: "COUPLE",
        authorName: couple,
        body: "Can we add 20 more guests for the sangeet?",
        createdAt: mins(180),
        readAt: mins(170),
      },
      {
        weddingId: wedding.id,
        author: "STAFF",
        authorName: wedding.leadPlanner?.name ?? "Ananya Mehta",
        userId: wedding.leadPlannerId,
        body: "Absolutely — I'll check with the caterer and send you the updated add-on to approve.",
        createdAt: mins(165),
        readAt: mins(150),
      },
      { weddingId: wedding.id, author: "COUPLE", authorName: couple, body: "Thank you! Also, can the mehendi start at 4 instead of 3?", createdAt: mins(120) },
    ],
  });
}
