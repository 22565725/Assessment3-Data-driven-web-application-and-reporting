import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../playwright.config";

/**
 * CLIENT USE CASE - retrieving and viewing an RSS feed.
 *
 * Required by Assessment 3: "One Playwright test must demonstrate a client
 * use case such as retrieving or viewing an RSS feed."
 *
 * These drive a real browser against the RSS Client, so they exercise the
 * whole path a person actually takes: page renders, client-side fetch
 * reaches the API on its own port, response is rendered.
 *
 * That last point is worth stating - the client fetches the API from the
 * BROWSER, cross-origin, so these tests would fail if CORS headers or the
 * host resolution broke. A server-side-only test would not notice.
 */

test.describe("Viewing feeds in the RSS Client", () => {
  test("lists posts fetched from the RSS Server", async ({ page }) => {
    await page.goto("/feeds");

    await expect(
      page.getByRole("heading", { name: "Feeds", level: 1 }),
    ).toBeVisible();

    // The loading state must resolve. If the client cannot reach the API it
    // renders an error instead, and this is where that would surface.
    await expect(page.getByText("Loading posts from the RSS Server")).toHaveCount(
      0,
      { timeout: 15_000 },
    );
    await expect(page.getByText("Could not reach the RSS Server")).toHaveCount(0);

    // Content came from the database, not a hardcoded array.
    const articles = page.locator("article");
    await expect(articles.first()).toBeVisible();
    expect(await articles.count()).toBeGreaterThan(0);
  });

  test("advertises the feed for subscription", async ({ page }) => {
    await page.goto("/feeds");

    // The visible half: a person can find the address.
    await expect(
      page.getByRole("heading", { name: "Subscribe to this feed" }),
    ).toBeVisible();

    const link = page.getByRole("link", { name: "Open RSS feed" });
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toContain("/rss.xml");
    // Resolved from window.location at runtime, so it must be absolute and
    // must not have fallen back to the server-side localhost default.
    expect(href).toMatch(/^https?:\/\//);
  });

  test("carries an RSS autodiscovery tag on every page", async ({ page }) => {
    // The machine-readable half: this is how a reader or browser extension
    // finds the feed without being told the address.
    for (const path of ["/", "/feeds", "/dashboard"]) {
      await page.goto(path);

      const tag = page.locator(
        'link[rel="alternate"][type="application/rss+xml"]',
      );
      await expect(tag).toHaveCount(1);

      const href = await tag.getAttribute("href");
      expect(href).toContain("/rss.xml");
      // Built from the request Host header, so it must be a real address
      // rather than the container-internal one.
      expect(href).toMatch(/^https?:\/\//);
    }
  });

  test("opens a post from the list", async ({ page }) => {
    await page.goto("/feeds");

    const firstPost = page.locator("article").first();
    await expect(firstPost).toBeVisible();

    const title = (await firstPost.locator("h2, h3").first().textContent())?.trim();
    await firstPost.getByRole("link").first().click();

    await page.waitForURL(/\/feeds\/\d+/);
    if (title) {
      await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
    }
  });

  test("serves a feed an external reader can consume", async ({ request }) => {
    // Retrieval as a real subscriber does it: no browser, just the document.
    const response = await request.get(API_BASE_URL + "/rss.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");

    const xml = await response.text();

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<item>");

    // Channel elements the specification requires.
    for (const element of ["<title>", "<link>", "<description>"]) {
      expect(xml).toContain(element);
    }

    // Tags must be counted OUTSIDE CDATA. The seed content explains the RSS
    // format and contains the literal text "<item>", which inside a CDATA
    // section is data rather than markup - counting it as a tag would make
    // this assertion fail on correct output.
    const withoutCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

    // Every item needs a guid, or a reader cannot tell new from already-seen.
    const items = withoutCdata.match(/<item>/g)?.length ?? 0;
    const guids = withoutCdata.match(/<guid/g)?.length ?? 0;
    expect(items).toBeGreaterThan(0);
    expect(guids).toBe(items);

    // Well-formedness: no unescaped ampersands outside CDATA sections.
    expect(withoutCdata).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/);
  });

  test("reports healthy on the operational endpoint", async ({ request }) => {
    // The brief requires /health to return 200 OK.
    const response = await request.get(API_BASE_URL + "/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.status).toBe("ok");
    // A health check that does not touch the database is close to useless:
    // the web process can be fine while every real request fails.
    expect(body.data.database.connected).toBe(true);
  });
});
