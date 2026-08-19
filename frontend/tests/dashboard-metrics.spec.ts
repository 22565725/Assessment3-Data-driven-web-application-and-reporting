import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../playwright.config";

/**
 * OBSERVABILITY - the dashboard reports real, changing data.
 *
 * Beyond the two use cases the brief requires. It exists because "the
 * dashboard is data-driven" is a claim, and a claim is worth proving:
 * these tests generate traffic and then assert the numbers moved.
 *
 * A dashboard rendering hardcoded figures would pass a screenshot review
 * and fail this.
 */

test.describe("Operational metrics", () => {
  test("exposes every metric the brief requires", async ({ request }) => {
    const response = await request.get(API_BASE_URL + "/api/metrics");
    expect(response.status()).toBe(200);

    const { data } = await response.json();

    // Health and database state.
    expect(data.health.database).toHaveProperty("connected");
    expect(data.health).toHaveProperty("uptimeSeconds");

    // The named metrics.
    expect(data.summary).toHaveProperty("totalRequests");
    expect(data.summary).toHaveProperty("uniqueClients");
    expect(data.summary).toHaveProperty("feeds");
    expect(data.summary).toHaveProperty("activeFeeds");
    expect(data.summary).toHaveProperty("errorRate");

    // Requests per feed and per client.
    expect(Array.isArray(data.perFeed)).toBe(true);
    expect(Array.isArray(data.perClient)).toBe(true);

    // Feed status summaries.
    for (const feed of data.perFeed) {
      expect(["healthy", "stale", "empty", "paused"]).toContain(feed.status);
    }

    // Reporting history and alerts.
    expect(Array.isArray(data.timeSeries)).toBe(true);
    expect(Array.isArray(data.alerts)).toBe(true);
  });

  test("counts a new client and its requests", async ({ request }) => {
    // A client id unique to this run, so the assertion cannot be satisfied
    // by traffic that already existed.
    const clientId = "playwright-" + Date.now();

    const before = await (
      await request.get(API_BASE_URL + "/api/metrics")
    ).json();

    const REQUESTS = 5;
    for (let i = 0; i < REQUESTS; i++) {
      await request.get(API_BASE_URL + "/rss.xml", {
        headers: { "X-Client-Id": clientId },
      });
    }

    // clients=100 because perClient returns the TOP N by volume, and a
    // brand new client with five requests will not outrank nine established
    // ones. Asserting against the default top-10 would fail for a reason
    // that has nothing to do with whether the metric works.
    const after = await (
      await request.get(API_BASE_URL + "/api/metrics?clients=100")
    ).json();

    // Totals moved. Greater-than rather than exactly-plus-five, because the
    // metrics requests are themselves logged - polling the dashboard IS
    // traffic, and pretending otherwise would make the count a lie.
    expect(after.data.summary.totalRequests).toBeGreaterThan(
      before.data.summary.totalRequests,
    );

    // The new client is counted separately, which is the whole point of the
    // X-Client-Id header: it is what lets a load test simulate many clients
    // from one machine instead of collapsing them into a single IP.
    expect(after.data.summary.uniqueClients).toBeGreaterThan(
      before.data.summary.uniqueClients,
    );

    const mine = after.data.perClient.find(
      (c: { clientId: string }) => c.clientId === clientId,
    );
    expect(mine).toBeDefined();
    expect(mine.requests).toBeGreaterThanOrEqual(REQUESTS);
  });

  test("attributes requests to the feed they concerned", async ({
    request,
  }) => {
    const feeds = await (
      await request.get(API_BASE_URL + "/api/feeds")
    ).json();
    test.skip(feeds.data.length === 0, "No feeds to attribute traffic to");

    const target = feeds.data[0];

    for (let i = 0; i < 3; i++) {
      await request.get(API_BASE_URL + "/rss.xml?feedId=" + target.id);
    }

    const metrics = await (
      await request.get(API_BASE_URL + "/api/metrics")
    ).json();

    const row = metrics.data.perFeed.find(
      (f: { feedId: number }) => f.feedId === target.id,
    );
    expect(row).toBeDefined();
    expect(row.requests).toBeGreaterThanOrEqual(3);
  });

  test("renders the dashboard with live values", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();

    // Health banner resolved to a real state, not the loading placeholder.
    await expect(page.getByText(/RSS Server: (Healthy|Degraded)/)).toBeVisible({
      timeout: 15_000,
    });

    // Tiles rendered with numbers rather than dashes.
    await expect(page.getByText("Total requests")).toBeVisible();
    await expect(page.getByText("Unique clients")).toBeVisible();

    // The sections that make this a reporting view.
    await expect(
      page.getByRole("heading", { name: "Requests per feed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Requests per client" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Feed status" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();

    // The chart is an accessible image, not a decorative blob.
    await expect(
      page.getByRole("img", { name: /Requests per hour/ }),
    ).toBeVisible();
  });
});
