"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type MetricsResponse } from "@/lib/api";
import HealthBanner from "@/Components/dashboard/HealthBanner";
import MetricTile from "@/Components/dashboard/MetricTile";
import AlertPanel from "@/Components/dashboard/AlertPanel";
import RequestChart from "@/Components/dashboard/RequestChart";
import BreakdownTable from "@/Components/dashboard/BreakdownTable";
import StatusChip from "@/Components/dashboard/StatusChip";

/**
 * The operations dashboard.
 *
 * Reads a single /api/metrics response and refreshes it on a timer, so the
 * page shows the system as it is now rather than as it was when the tab was
 * opened. Everything on screen is derived from the database - there are no
 * hardcoded figures anywhere in this file.
 *
 * Ordered by the question it answers: is it working, how much is it doing,
 * what needs attention, then the detail behind those answers.
 */

const REFRESH_MS = 5000;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  // Held in a ref so toggling live mode does not re-create the loader and
  // restart the interval on every render.
  const liveRef = useRef(live);
  liveRef.current = live;

  const load = useCallback(async () => {
    try {
      const data = await api.metrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      // The previous reading is deliberately kept on screen. Blanking the
      // dashboard the moment a poll fails destroys the context needed to
      // work out what just went wrong.
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (liveRef.current) load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const summary = metrics?.summary;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted">
            Live operational view of the RSS Server, read from the database on
            every refresh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLive((value) => !value)}
            aria-pressed={live}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
          >
            {live ? "Pause live updates" : "Resume live updates"}
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:bg-accent-hover"
          >
            Refresh now
          </button>
        </div>
      </div>

      <HealthBanner
        health={metrics?.health ?? null}
        unreachable={!!error && !metrics}
        generatedAt={metrics?.generatedAt}
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger bg-surface p-3 text-sm text-foreground"
        >
          Last refresh failed: {error}
          {metrics && " — showing the previous reading."}
        </p>
      )}

      {loading && !metrics && (
        <p className="text-muted">Loading metrics from the RSS Server…</p>
      )}

      {summary && metrics && (
        <>
          <section aria-label="Key metrics">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <MetricTile
                label="Total requests"
                value={summary.totalRequests.toLocaleString("en-AU")}
                hint={summary.requestsLastHour + " in the last hour"}
              />
              <MetricTile
                label="Unique clients"
                value={summary.uniqueClients.toLocaleString("en-AU")}
                hint={summary.uniqueClientsLast24h + " in 24h"}
              />
              <MetricTile
                label="RSS feeds"
                value={summary.activeFeeds + " / " + summary.feeds}
                hint="active / total"
              />
              <MetricTile
                label="Posts"
                value={summary.posts.toLocaleString("en-AU")}
                hint={summary.authors + " authors"}
              />
              <MetricTile
                label="Error rate"
                value={(summary.errorRate * 100).toFixed(1) + "%"}
                hint={summary.errors + " failed requests"}
                // The threshold is what makes this a status rather than a
                // statistic: 5% is the line between noise and a problem.
                tone={
                  summary.errorRate > 0.05
                    ? "danger"
                    : summary.errorRate > 0
                      ? "warning"
                      : "success"
                }
              />
              <MetricTile
                label="Avg response"
                value={
                  summary.averageDurationMs === null
                    ? "—"
                    : summary.averageDurationMs + "ms"
                }
                hint="across all requests"
              />
            </div>
          </section>

          <AlertPanel alerts={metrics.alerts} />

          <section
            aria-labelledby="traffic-heading"
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h2
              id="traffic-heading"
              className="font-semibold text-foreground"
            >
              Requests over time
            </h2>
            <p className="mb-3 text-sm text-muted">
              Hourly totals for the last 24 hours, from the request log.
            </p>
            <RequestChart data={metrics.timeSeries} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable
              title="Requests per feed"
              caption="Which feeds the traffic is actually asking for."
              valueLabel="Requests"
              secondaryLabel="Posts"
              emptyMessage="No feed-attributed requests recorded yet."
              rows={metrics.perFeed.map((feed) => ({
                key: String(feed.feedId),
                label: feed.title,
                value: feed.requests,
                secondary: feed.posts,
                trailing: <StatusChip status={feed.status} />,
              }))}
            />

            <BreakdownTable
              title="Requests per client"
              caption="Identified by client key, or a salted hash of the IP."
              valueLabel="Requests"
              secondaryLabel="Errors"
              emptyMessage="No client-attributed requests recorded yet."
              rows={metrics.perClient.map((client) => ({
                key: client.clientId,
                label: (
                  <span className="font-mono text-xs">{client.clientId}</span>
                ),
                value: client.requests,
                secondary: client.errors,
                trailing: (
                  <span className="text-xs text-muted">
                    {new Date(client.lastSeen).toLocaleTimeString("en-AU")}
                  </span>
                ),
              }))}
            />
          </div>

          <section
            aria-labelledby="feed-status-heading"
            className="rounded-lg border border-border bg-surface p-4"
          >
            <h2
              id="feed-status-heading"
              className="font-semibold text-foreground"
            >
              Feed status
            </h2>
            <p className="mb-3 text-sm text-muted">
              Derived on read: paused when inactive, empty with no posts,
              stale when not fetched in 24 hours.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Feed
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="py-2 pr-3 text-right font-medium"
                    >
                      Posts
                    </th>
                    <th
                      scope="col"
                      className="py-2 pr-3 text-right font-medium"
                    >
                      Requests
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Last fetched
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.perFeed.map((feed) => (
                    <tr key={feed.feedId} className="border-b border-border">
                      <th
                        scope="row"
                        className="py-2 pr-3 text-left font-normal text-foreground"
                      >
                        {feed.title}
                      </th>
                      <td className="py-2 pr-3">
                        <StatusChip status={feed.status} />
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                        {feed.posts}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                        {feed.requests}
                      </td>
                      <td className="py-2 text-muted">
                        {feed.lastFetchedAt
                          ? new Date(feed.lastFetchedAt).toLocaleString(
                              "en-AU",
                            )
                          : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-muted">
            Counting since{" "}
            {summary.countingSince
              ? new Date(summary.countingSince).toLocaleString("en-AU")
              : "the first request"}
            . Refreshing every {REFRESH_MS / 1000} seconds while live updates
            are on.
          </p>
        </>
      )}
    </main>
  );
}
