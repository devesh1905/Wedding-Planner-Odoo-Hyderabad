import { PrismaClient } from "@prisma/client";

// One client per server process (hot reload in dev would otherwise open new connections each time).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
