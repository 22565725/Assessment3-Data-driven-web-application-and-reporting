import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok, preflight } from "@/lib/http";

/**
 * GET /api/count - request and content statistics.
 *
 * Counts come from the RequestLog table rather than an in-memory variable.
 * An in-memory counter resets to zero every time the process restarts or
 * the container is rebuilt, which makes it worthless as an operational
 * metric - and it would report a different number per replica. Persisting
 * each request means the figure survives a restart, and gives Assessment 3
 * the raw rows it needs for dashboards and alerting.
 */

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalRequests,
      requestsLast24h,
      byPath,
      byMethod,
      errorCount,
      firstLog,
      feeds,
      activeFeeds,
      posts,
      authors,
      categories,
    ] = await Promise.all([
      prisma.requestLog.count(),
      prisma.requestLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.requestLog.groupBy({
        by: ["path"],
        _count: { _all: true },
        _avg: { durationMs: true },
      }),
      prisma.requestLog.groupBy({
        by: ["method"],
        _count: { _all: true },
      }),
      prisma.requestLog.count({ where: { statusCode: { gte: 400 } } }),
      prisma.requestLog.findFirst({ orderBy: { createdAt: "asc" } }),
      prisma.feed.count(),
      prisma.feed.count({ where: { active: true } }),
      prisma.post.count(),
      prisma.author.count(),
      prisma.category.count(),
    ]);

    return ok({
      service: "rss-server-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),

      requests: {
        total: totalRequests,
        last24Hours: requestsLast24h,
        errors: errorCount,
        errorRate:
          totalRequests > 0
            ? Number(((errorCount / totalRequests) * 100).toFixed(2))
            : 0,
        countingSince: firstLog?.createdAt ?? null,
        byMethod: byMethod.map((row) => ({
          method: row.method,
          count: row._count._all,
        })),
        byEndpoint: byPath
          .map((row) => ({
            path: row.path,
            count: row._count._all,
            averageDurationMs:
              row._avg.durationMs === null
                ? null
                : Math.round(row._avg.durationMs),
          }))
          .sort((a, b) => b.count - a.count),
      },

      content: {
        feeds,
        activeFeeds,
        posts,
        authors,
        categories,
      },
    });
  });
}
