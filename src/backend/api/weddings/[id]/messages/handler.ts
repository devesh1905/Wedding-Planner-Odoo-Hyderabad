import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { messageInput } from "@/shared/schemas/messages";

const MESSAGE_SELECT = { id: true, author: true, authorName: true, body: true, createdAt: true } as const;

async function assertWedding(id: string) {
  const w = await db.wedding.findUnique({ where: { id }, select: { id: true } });
  if (!w) throw new HttpError(404, "Wedding not found");
}

// Team opens the thread: return it oldest to newest and mark the couple's messages as read.
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  await assertWedding(id);
  await db.message.updateMany({ where: { weddingId: id, author: "COUPLE", readAt: null }, data: { readAt: new Date() } });
  const messages = await db.message.findMany({ where: { weddingId: id }, orderBy: { createdAt: "asc" }, select: MESSAGE_SELECT });
  return NextResponse.json(messages);
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireUser();
  const { id } = await params;
  const { body } = messageInput.parse(await req.json());
  await assertWedding(id);
  const message = await db.message.create({
    data: { weddingId: id, author: "STAFF", authorName: session.name, userId: session.sub, body },
    select: MESSAGE_SELECT,
  });
  return NextResponse.json(message, { status: 201 });
});
