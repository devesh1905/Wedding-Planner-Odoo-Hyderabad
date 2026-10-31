import { PrismaClient } from "@prisma/client";

// One client per server process (hot reload in dev would otherwise open new connections each time).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Generous transaction limits: the database is a network hop away (pooler), so multi-query
// transactions need headroom, especially from a laptop during development.
export const db = globalForPrisma.prisma ?? new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 20_000 } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
