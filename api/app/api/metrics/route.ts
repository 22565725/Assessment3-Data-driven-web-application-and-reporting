import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok, preflight } from "@/lib/http";
import {
  getSummary,
  getPerFeed,
  getPerClient,
  getTimeSeries,
  getAlerts,
  buildSnapshots,
} from "@/lib/metrics";

/**
 * GET /api/metrics - everything the dashboard needs, in one response.
 *
 *   ?hours=24     size of the time series window (1-168)
 *   ?clients=10   how many top clients to return
 *   ?snapshot=1   also roll completed hours into MetricSnapshot
 *
 * Deliberately one endpoint rather than six. The dashboard polls on a timer,
 * and six separate requests per poll would multiply the load it is meant to
 * be measuring - and could return figures from six slightly different
 * moments, so the tiles would not agree with the table beneath them.
 *
 * Note this endpoint is itself logged, like every other route. That is
 * correct: polling the dashboard IS traffic, and hiding it would make the
 * request count a lie.
 */

/** Bounds on the window, so a stray ?hours=99999 cannot scan the whole table. */
const MIN_HOURS = 1;
const MAX_HOURS = 168;

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const params = request.nextUrl.searchParams;

    const hours = clamp(params.get("hours"), 24, MIN_HOURS, MAX_HOURS);
    const clients = clamp(params.get("clients"), 10, 1, 100);

    // Health is measured here rather than reused from /api/health so the
    // dashboard reports one coherent moment, and so a failing database
    // still produces a rendered dashboard saying so - rather than a failed
    // request and a blank screen, which is when an operator most needs it.
    const startedAt = Date.now();
    let databaseConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseConnected = false;
    }
    const databaseLatencyMs = Date.now() - startedAt;

    const [summary, perFeed, perClient, timeSeries] = await Promise.all([
      getSummary(),
      getPerFeed(),
      getPerClient(clients),
      getTimeSeries(hours),
    ]);

    // Alerts depend on the feed rows, so they are derived after rather than
    // in parallel - it avoids querying the same feeds twice.
    const alerts = await getAlerts(perFeed);

    if (params.get("snapshot") === "1") {
      await buildSnapshots(hours);
    }

    return ok({
      health: {
        status: databaseConnected ? "ok" : "degraded",
        service: "rss-server-api",
        uptimeSeconds: Math.round(process.uptime()),
        database: {
          connected: databaseConnected,
          provider: "sqlite",
          latencyMs: databaseLatencyMs,
        },
        environment: process.env.NODE_ENV ?? "development",
      },
      summary,
      perFeed,
      perClient,
      timeSeries,
      alerts,
      generatedAt: new Date().toISOString(),
    });
  });
}

/** Reads a bounded integer query parameter, falling back to a default. */
function clamp(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}
