import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok, fail, preflight } from "@/lib/http";

/**
 * GET /api/health - liveness and readiness probe.
 *
 * A health check that only returns { status: "ok" } is close to useless: the
 * web process can be perfectly alive while the database behind it is gone,
 * and every real request still fails. So this actually queries SQLite and
 * reports the round-trip time.
 *
 * Returns 200 when the database answers, 503 when it does not, so a load
 * balancer or Docker HEALTHCHECK can act on the status code alone.
 */

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const startedAt = Date.now();

    try {
      // Cheapest possible query that still proves the connection works.
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      return fail("Database unreachable", 503, {
        service: "rss-server-api",
        database: { connected: false },
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return ok({
      status: "ok",
      service: "rss-server-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        connected: true,
        provider: "sqlite",
        latencyMs: Date.now() - startedAt,
      },
      environment: process.env.NODE_ENV ?? "development",
    });
  });
}
