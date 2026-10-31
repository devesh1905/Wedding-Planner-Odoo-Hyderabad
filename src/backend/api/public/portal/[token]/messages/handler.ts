import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError } from "@/backend/auth";
import { coupleMessageInput } from "@/shared/schemas/messages";

const MESSAGE_SELECT = { id: true, author: true, authorName: true, body: true, createdAt: true } as const;
const HOURLY_LIMIT = 30;

async function weddingByToken(token: string) {
  const w = await db.wedding.findUnique({ where: { portalToken: token }, select: { id: true, partner1: true, partner2: true } });
  if (!w) throw new HttpError(404, "This link is not valid");
  return w;
}

// Couple opens the thread: return it oldest to newest and mark the planners' replies as read.
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const w = await weddingByToken((await params).token);
  await db.message.updateMany({ where: { weddingId: w.id, author: "STAFF", readAt: null }, data: { readAt: new Date() } });
  const messages = await db.message.findMany({ where: { weddingId: w.id }, orderBy: { createdAt: "asc" }, select: MESSAGE_SELECT });
  return NextResponse.json(messages);
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const w = await weddingByToken((await params).token);
  const { body, name } = coupleMessageInput.parse(await req.json());
  // The link is public, so cap how fast one wedding can post (guards against spam if the link leaks).
  const recent = await db.message.count({ where: { weddingId: w.id, author: "COUPLE", createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= HOURLY_LIMIT) throw new HttpError(429, "Too many messages. Please try again in a little while.");
  const message = await db.message.create({
    data: { weddingId: w.id, author: "COUPLE", authorName: name ?? `${w.partner1} & ${w.partner2}`, body },
    select: MESSAGE_SELECT,
  });
  return NextResponse.json(message, { status: 201 });
});
