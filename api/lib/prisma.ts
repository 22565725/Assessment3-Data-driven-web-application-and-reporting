import { PrismaClient } from "@prisma/client";

// Next.js hot-reloads modules on every file save in development. Without this
// cache a brand new PrismaClient - and a new pool of database connections -
// would be created on each reload until the process ran out of handles.
// Stashing the instance on globalThis keeps exactly one client alive.
//
// In production the module is evaluated once, so the global is skipped.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
