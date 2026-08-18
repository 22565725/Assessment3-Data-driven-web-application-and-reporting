/**
 * Dashboard metrics.
 *
 * Every figure the dashboard shows is derived here, in one module, so the
 * route stays a thin HTTP wrapper and the same functions can be reused by
 * the snapshot builder or any future report.
 *
 * The governing rule: RequestLog is the source of truth. Anything shown on
 * the dashboard can be recomputed from those rows, which is why a snapshot
 * can never quietly disagree with reality - at worst it is stale, and
 * rebuilding it fixes it.
 */

import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

/** A feed is considered stale if it has not been fetched within this window. */
export const STALE_HOURS = 24;

/** Above this many rejected payloads in an hour, something is wrong upstream. */
const INVALID_DATA_THRESHOLD = 10;

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface MetricsSummary {
  totalRequests: number;
  requestsLast24h: number;
  requestsLastHour: number;
  uniqueClients: number;
  uniqueClientsLast24h: number;
  errors: number;
  errorRate: number;
  averageDurationMs: number | null;
  feeds: number;
  activeFeeds: number;
  posts: number;
  authors: number;
  categories: number;
  countingSince: string | null;
}

export type FeedHealth = "healthy" | "paused" | "empty" | "stale";

export interface FeedMetric {
  feedId: number;
  title: string;
  active: boolean;
  posts: number;
  requests: number;
  lastFetchedAt: string | null;
  lastPublishedAt: string | null;
  status: FeedHealth;
}

export interface ClientMetric {
  clientId: string;
  requests: number;
  errors: number;
  lastSeen: string;
}

export interface TimeBucket {
  /** ISO timestamp of the start of the hour. */
  bucket: string;
  requests: number;
  errors: number;
  uniqueClients: number;
  averageDurationMs: number | null;
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  severity: AlertSeverity;
  /** Machine-readable kind, so the UI can group or icon them. */
  kind: string;
  title: string;
  detail: string;
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

export async function getSummary(): Promise<MetricsSummary> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * HOUR_MS);
  const hourAgo = new Date(now - HOUR_MS);

  const [
    totalRequests,
    requestsLast24h,
    requestsLastHour,
    errors,
    duration,
    allClients,
    recentClients,
    firstLog,
    feeds,
    activeFeeds,
    posts,
    authors,
    categories,
  ] = await Promise.all([
    prisma.requestLog.count(),
    prisma.requestLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.requestLog.count({ where: { createdAt: { gte: hourAgo } } }),
    prisma.requestLog.count({ where: { statusCode: { gte: 400 } } }),
    prisma.requestLog.aggregate({ _avg: { durationMs: true } }),
    // groupBy rather than findMany + distinct: the database does the
    // de-duplication and returns one row per client instead of every request.
    prisma.requestLog.groupBy({
      by: ["clientId"],
      where: { clientId: { not: null } },
    }),
    prisma.requestLog.groupBy({
      by: ["clientId"],
      where: { clientId: { not: null }, createdAt: { gte: dayAgo } },
    }),
    prisma.requestLog.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.feed.count(),
    prisma.feed.count({ where: { active: true } }),
    prisma.post.count(),
    prisma.author.count(),
    prisma.category.count(),
  ]);

  return {
    totalRequests,
    requestsLast24h,
    requestsLastHour,
    uniqueClients: allClients.length,
    uniqueClientsLast24h: recentClients.length,
    errors,
    // Guarded: a brand new deployment has zero requests, and 0/0 is NaN,
    // which would render as "NaN%" on the dashboard.
    errorRate: totalRequests > 0 ? errors / totalRequests : 0,
    averageDurationMs:
      duration._avg.durationMs !== null
        ? Math.round(duration._avg.durationMs)
        : null,
    feeds,
    activeFeeds,
    posts,
    authors,
    categories,
    countingSince: firstLog?.createdAt.toISOString() ?? null,
  };
}

/* ------------------------------------------------------------------ *
 * Per feed
 * ------------------------------------------------------------------ */

/**
 * Requests per feed, joined to each feed's own content and status.
 *
 * The request counts come from RequestLog.feedId, which survives the feed
 * being deleted - so a feed removed today does not silently erase the
 * traffic it served yesterday. Rows whose feed no longer exists are
 * reported as deleted rather than dropped.
 */
export async function getPerFeed(): Promise<FeedMetric[]> {
  const staleBefore = new Date(Date.now() - STALE_HOURS * HOUR_MS);

  const [feeds, requestsByFeed, newestPostByFeed] = await Promise.all([
    prisma.feed.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.requestLog.groupBy({
      by: ["feedId"],
      where: { feedId: { not: null } },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ["feedId"],
      _max: { publishedAt: true },
    }),
  ]);

  const requests = new Map(
    requestsByFeed.map((row) => [row.feedId, row._count._all]),
  );
  const newestPost = new Map(
    newestPostByFeed.map((row) => [row.feedId, row._max.publishedAt]),
  );

  const rows: FeedMetric[] = feeds.map((feed) => {
    const postCount = feed._count.posts;

    // Order matters: a paused feed with no posts is reported as paused,
    // because that is the fact the operator acted on.
    let status: FeedHealth = "healthy";
    if (!feed.active) status = "paused";
    else if (postCount === 0) status = "empty";
    else if (!feed.lastFetchedAt || feed.lastFetchedAt < staleBefore)
      status = "stale";

    return {
      feedId: feed.id,
      title: feed.title,
      active: feed.active,
      posts: postCount,
      requests: requests.get(feed.id) ?? 0,
      lastFetchedAt: feed.lastFetchedAt?.toISOString() ?? null,
      lastPublishedAt: newestPost.get(feed.id)?.toISOString() ?? null,
      status,
    };
  });

  // Traffic attributed to feeds that have since been deleted.
  const knownIds = new Set(feeds.map((f) => f.id));
  for (const row of requestsByFeed) {
    if (row.feedId !== null && !knownIds.has(row.feedId)) {
      rows.push({
        feedId: row.feedId,
        title: "(deleted feed " + row.feedId + ")",
        active: false,
        posts: 0,
        requests: row._count._all,
        lastFetchedAt: null,
        lastPublishedAt: null,
        status: "paused",
      });
    }
  }

  return rows.sort((a, b) => b.requests - a.requests);
}

/* ------------------------------------------------------------------ *
 * Per client
 * ------------------------------------------------------------------ */

export async function getPerClient(limit = 10): Promise<ClientMetric[]> {
  const [totals, errors] = await Promise.all([
    prisma.requestLog.groupBy({
      by: ["clientId"],
      where: { clientId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.requestLog.groupBy({
      by: ["clientId"],
      where: { clientId: { not: null }, statusCode: { gte: 400 } },
      _count: { _all: true },
    }),
  ]);

  const errorsByClient = new Map(
    errors.map((row) => [row.clientId, row._count._all]),
  );

  return totals
    .map((row) => ({
      clientId: row.clientId as string,
      requests: row._count._all,
      errors: errorsByClient.get(row.clientId) ?? 0,
      lastSeen: (row._max.createdAt ?? new Date()).toISOString(),
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Time series
 * ------------------------------------------------------------------ */

/** Truncates a timestamp to the start of its hour. */
function hourStart(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Hourly request volume for the last `hours` hours.
 *
 * Buckets are built in JavaScript rather than SQL so the logic is portable
 * and readable - SQLite date handling would need the storage format baked
 * into a raw query, and this has to survive a move to Postgres.
 *
 * Empty hours are emitted with zeroes rather than omitted: a chart that
 * skips quiet hours compresses the gap and misrepresents the shape.
 */
export async function getTimeSeries(hours = 24): Promise<TimeBucket[]> {
  const since = hourStart(new Date(Date.now() - (hours - 1) * HOUR_MS));

  const rows = await prisma.requestLog.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      statusCode: true,
      durationMs: true,
      clientId: true,
    },
  });

  interface Acc {
    requests: number;
    errors: number;
    clients: Set<string>;
    durationTotal: number;
    durationCount: number;
  }

  const buckets = new Map<number, Acc>();
  for (let i = 0; i < hours; i++) {
    buckets.set(since.getTime() + i * HOUR_MS, {
      requests: 0,
      errors: 0,
      clients: new Set<string>(),
      durationTotal: 0,
      durationCount: 0,
    });
  }

  for (const row of rows) {
    const key = hourStart(row.createdAt).getTime();
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.requests++;
    if (row.statusCode >= 400) bucket.errors++;
    if (row.clientId) bucket.clients.add(row.clientId);
    if (row.durationMs !== null) {
      bucket.durationTotal += row.durationMs;
      bucket.durationCount++;
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, acc]) => ({
      bucket: new Date(time).toISOString(),
      requests: acc.requests,
      errors: acc.errors,
      uniqueClients: acc.clients.size,
      averageDurationMs:
        acc.durationCount > 0
          ? Math.round(acc.durationTotal / acc.durationCount)
          : null,
    }));
}

/* ------------------------------------------------------------------ *
 * Snapshots
 * ------------------------------------------------------------------ */

/**
 * Writes completed hours into MetricSnapshot.
 *
 * Only fully elapsed hours are stored: the current hour is still
 * accumulating, and persisting a partial figure would leave a permanently
 * wrong row behind once the hour ended. Keyed on bucketStart and upserted,
 * so running this repeatedly is harmless.
 */
export async function buildSnapshots(hours = 24): Promise<number> {
  const series = await getTimeSeries(hours);
  const currentHour = hourStart(new Date()).getTime();

  const [feedCount, postCount] = await Promise.all([
    prisma.feed.count(),
    prisma.post.count(),
  ]);

  let written = 0;
  for (const bucket of series) {
    const start = new Date(bucket.bucket);
    if (start.getTime() >= currentHour) continue;

    await prisma.metricSnapshot.upsert({
      where: { bucketStart: start },
      create: {
        bucketStart: start,
        requests: bucket.requests,
        errors: bucket.errors,
        uniqueClients: bucket.uniqueClients,
        avgDurationMs: bucket.averageDurationMs,
        feedCount,
        postCount,
      },
      update: {
        requests: bucket.requests,
        errors: bucket.errors,
        uniqueClients: bucket.uniqueClients,
        avgDurationMs: bucket.averageDurationMs,
      },
    });
    written++;
  }

  return written;
}

/* ------------------------------------------------------------------ *
 * Alerts
 * ------------------------------------------------------------------ */

/**
 * Derives the warning and error indicators the dashboard shows.
 *
 * Every alert is computed from data rather than configured, so the panel
 * reflects the system's actual state at the moment it is read. Ordered most
 * severe first, because that is the order an operator should read them.
 */
export async function getAlerts(feeds: FeedMetric[]): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const hourAgo = new Date(Date.now() - HOUR_MS);

  // 1. Is the database actually reachable?
  let databaseUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseUp = false;
  }
  if (!databaseUp) {
    alerts.push({
      severity: "critical",
      kind: "database-unreachable",
      title: "Database unreachable",
      detail: "The API is running but SQLite is not answering queries.",
    });
  }

  // 2. Server errors - something threw, rather than something was refused.
  const serverErrors = await prisma.requestLog.count({
    where: { statusCode: { gte: 500 }, createdAt: { gte: hourAgo } },
  });
  if (serverErrors > 0) {
    alerts.push({
      severity: "critical",
      kind: "server-errors",
      title:
        serverErrors +
        " server error" +
        (serverErrors === 1 ? "" : "s") +
        " in the last hour",
      detail: "Requests failed inside the server. Check the API logs.",
    });
  }

  // 3. Rejected payloads - a client is sending data we will not store.
  const rejected = await prisma.requestLog.count({
    where: { statusCode: { gte: 400, lt: 500 }, createdAt: { gte: hourAgo } },
  });
  if (rejected > INVALID_DATA_THRESHOLD) {
    alerts.push({
      severity: "warning",
      kind: "invalid-data",
      title: rejected + " rejected requests in the last hour",
      detail:
        "Payloads are failing validation or addressing records that do not exist.",
    });
  }

  // 4. Feeds with nothing in them - subscribers receive an empty document.
  for (const feed of feeds.filter((f) => f.status === "empty")) {
    alerts.push({
      severity: "warning",
      kind: "empty-feed",
      title: feed.title + " has no posts",
      detail: "The feed is active, so subscribers receive an empty channel.",
    });
  }

  // 5. Feeds not refreshed recently - the content is going out of date.
  for (const feed of feeds.filter((f) => f.status === "stale")) {
    alerts.push({
      severity: "warning",
      kind: "stale-feed",
      title: feed.title + " has not been fetched recently",
      detail: feed.lastFetchedAt
        ? "Last fetched " + feed.lastFetchedAt + "."
        : "This feed has never been fetched.",
    });
  }

  // 6. Nothing is happening at all. Not a failure, but worth surfacing:
  //    without it, silence and health look identical.
  const recentRequests = await prisma.requestLog.count({
    where: { createdAt: { gte: hourAgo } },
  });
  if (recentRequests === 0) {
    alerts.push({
      severity: "info",
      kind: "idle",
      title: "No requests in the last hour",
      detail: "The server is up but nothing is calling it.",
    });
  }

  const order: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
