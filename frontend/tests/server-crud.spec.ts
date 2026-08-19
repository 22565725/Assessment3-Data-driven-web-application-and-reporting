import { test, expect } from "@playwright/test";
import { API_BASE_URL } from "../playwright.config";

/**
 * SERVER USE CASE - CRUD operations for an RSS feed.
 *
 * Required by Assessment 3: "One Playwright test must demonstrate a server
 * use case such as CRUD operations for an RSS feed."
 *
 * These talk to the RSS Server directly over HTTP, with no browser involved,
 * because that is what a server use case is - the API has to be correct for
 * any client, not just ours.
 *
 * Every feed created here carries a run-unique URL. Feed.url is UNIQUE in
 * the schema, so a fixed value would pass once and then fail with a 409 on
 * every later run - and a test that only works on a clean database is not
 * much of a test.
 */

const runId = Date.now();
const feedUrl = "https://example.com/e2e/" + runId + "/feed.xml";

/** Set on the created feed so later tests in the file can address it. */
let feedId: number;

test.describe.serial("RSS feed CRUD", () => {
  test("creates a feed", async ({ request }) => {
    const response = await request.post(API_BASE_URL + "/api/feeds", {
      data: {
        title: "E2E Test Feed " + runId,
        url: feedUrl,
        siteUrl: "https://example.com/e2e",
        description: "Created by the Playwright server use case test.",
        language: "en",
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("E2E Test Feed " + runId);
    expect(body.data.url).toBe(feedUrl);
    // The database assigns the id, which is the point of having a database.
    expect(body.data.id).toBeGreaterThan(0);

    feedId = body.data.id;
  });

  test("rejects a duplicate feed url with 409", async ({ request }) => {
    // url is UNIQUE, and a duplicate is a CLIENT error, not a server fault.
    // Returning 500 here would be both unhelpful and wrong.
    const response = await request.post(API_BASE_URL + "/api/feeds", {
      data: { title: "Duplicate", url: feedUrl },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("rejects an invalid payload with field-level detail", async ({
    request,
  }) => {
    const response = await request.post(API_BASE_URL + "/api/feeds", {
      data: {
        title: "Invalid",
        // Parses as a URL, but the protocol is not one we will publish.
        url: "javascript:alert(1)",
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    // The client must be told WHICH field failed, not just that something did.
    const fields = (body.error.details ?? []).map(
      (d: { field: string }) => d.field,
    );
    expect(fields).toContain("url");
  });

  test("reads the feed back", async ({ request }) => {
    const response = await request.get(
      API_BASE_URL + "/api/feeds?id=" + feedId,
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.id).toBe(feedId);
    expect(body.data.url).toBe(feedUrl);
    expect(Array.isArray(body.data.posts)).toBe(true);
  });

  test("adds a post to the feed", async ({ request }) => {
    const response = await request.post(API_BASE_URL + "/api/posts", {
      data: {
        title: "E2E Test Post " + runId,
        feedId,
        description: "A post created by the server use case test.",
        link: "https://example.com/e2e/" + runId + "/post",
        author: "Playwright Runner",
        categories: ["Testing"],
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.data.title).toBe("E2E Test Post " + runId);
    // author and categories are sent as NAMES; the API resolves them to rows.
    expect(body.data.author.name).toBe("Playwright Runner");
    expect(body.data.categories.map((c: { name: string }) => c.name)).toContain(
      "Testing",
    );
  });

  test("publishes the feed as RSS 2.0 XML", async ({ request }) => {
    // The capability Assessment 2 was marked down for. A feed that exists in
    // the database but cannot be served as XML is not an RSS server.
    const response = await request.get(
      API_BASE_URL + "/rss.xml?feedId=" + feedId,
    );

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");

    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("E2E Test Post " + runId);
    // The self-reference RSS 2.0 has no element for.
    expect(xml).toContain('rel="self"');
    // RFC-822 dates, not ISO - readers reject anything else.
    expect(xml).toMatch(
      /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT<\/pubDate>/,
    );
  });

  test("updates the feed", async ({ request }) => {
    const response = await request.patch(
      API_BASE_URL + "/api/feeds?id=" + feedId,
      { data: { title: "E2E Test Feed (updated)", active: false } },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.title).toBe("E2E Test Feed (updated)");
    expect(body.data.active).toBe(false);
    // A partial update must not blank the fields it did not mention.
    expect(body.data.url).toBe(feedUrl);
  });

  test("deletes the feed and cascades to its posts", async ({ request }) => {
    const response = await request.delete(
      API_BASE_URL + "/api/feeds?id=" + feedId,
    );
    expect(response.status()).toBe(200);

    // Gone means gone.
    const after = await request.get(API_BASE_URL + "/api/feeds?id=" + feedId);
    expect(after.status()).toBe(404);

    // onDelete: Cascade in the schema - an orphaned post has no meaning.
    const posts = await request.get(
      API_BASE_URL + "/api/posts?feedId=" + feedId,
    );
    const body = await posts.json();
    expect(body.data).toHaveLength(0);
  });
});
