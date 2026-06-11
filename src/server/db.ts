import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma client singleton. Only src/server/repositories/* may import this —
// route handlers and server actions go through the repositories.
//
// Postgres seam: in prod, swap PrismaBetterSqlite3 for @prisma/adapter-pg
// pointed at DATABASE_URL. Nothing else changes.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Reuse the client across dev hot reloads instead of leaking connections.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
