/**
 * Simulated input records for the RSS Server.  Run:  npm run db:simulate
 *
 * Assessment 3 asks the dashboard to report on data over time, and a
 * freshly seeded database cannot demonstrate that: every feed looks
 * identical, every chart is a flat line, and the alert panel has nothing to
 * say. This script generates the history that makes those views meaningful.
 *
 * Two kinds of records, because the dashboard reads two kinds:
 *
 *   CONTENT   feeds, authors, categories and posts, published across the
 *             last few weeks so "newest first" and per-feed counts differ.
 *
 *   TRAFFIC   RequestLog rows backdated across the last 48 hours, attributed
 *             to several clients and feeds, so requests-per-feed,
 *             requests-per-client, unique-client counts and the hourly chart
 *             all have something real to show.
 *
 * The feed states are chosen deliberately to cover every branch of the
 * status logic - healthy, stale, empty and paused - so the alert panel
 * demonstrates each kind of warning rather than just the one that happens
 * to occur.
 *
 * Flags:
 *   --reset     delete simulated traffic first, for a clean re-run
 *   --days=N    how many days of content history (default 21)
 *   --hours=N   how many hours of traffic history (default 48)
 *   --seed=N    PRNG seed, so a run is reproducible (default 22565725)
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

function flag(name, fallback) {
  const match = process.argv.find((a) => a.startsWith("--" + name + "="));
  if (!match) return fallback;
  const value = Number.parseInt(match.split("=")[1], 10);
  return Number.isInteger(value) ? value : fallback;
}

const RESET = process.argv.includes("--reset");
const DAYS = flag("days", 21);
const HOURS = flag("hours", 48);
const SEED = flag("seed", 22565725);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * A small deterministic PRNG (mulberry32).
 *
 * Math.random would make every run produce different figures, so a
 * screenshot taken today could not be reproduced tomorrow and a demo could
 * not be rehearsed. Seeding it means the same command always builds the
 * same dashboard.
 */
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(SEED);

const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

const IMG = (seed) => "https://picsum.photos/seed/" + seed + "/600/400";

/**
 * Feeds an LMS would realistically aggregate, each with a state chosen to
 * exercise a different branch of the dashboard's status logic.
 */
const FEEDS = [
  {
    title: "CSE5006 Project Blog",
    url: "https://example.com/cse5006/feed.xml",
    siteUrl: "https://example.com/cse5006",
    description: "Development notes from the CSE5006 RSS server project.",
    // Fetched minutes ago: the healthy case.
    fetchedHoursAgo: 0.5,
    active: true,
    postCount: 0, // keeps the Assessment 1 posts already seeded
  },
  {
    title: "CSE5006 Subject Announcements",
    url: "https://example.com/cse5006/announcements.xml",
    siteUrl: "https://example.com/cse5006/announcements",
    description: "Official announcements for CSE5006.",
    fetchedHoursAgo: 2,
    active: true,
    postCount: 0,
  },
  {
    title: "La Trobe University News",
    url: "https://example.com/latrobe/news.xml",
    siteUrl: "https://example.com/latrobe/news",
    description: "Campus news, events and student notices.",
    fetchedHoursAgo: 1,
    active: true,
    postCount: 9,
  },
  {
    title: "Library Workshops",
    url: "https://example.com/latrobe/library.xml",
    siteUrl: "https://example.com/latrobe/library",
    description: "Research skills and referencing workshops.",
    fetchedHoursAgo: 6,
    active: true,
    postCount: 5,
  },
  {
    title: "Cloud Computing Weekly",
    url: "https://example.com/cloud/weekly.xml",
    siteUrl: "https://example.com/cloud",
    description: "Industry reading on cloud architecture and deployment.",
    // Not fetched in over two days: triggers the stale-feed warning.
    fetchedHoursAgo: 52,
    active: true,
    postCount: 4,
  },
  {
    title: "Student Union Notices",
    url: "https://example.com/union/notices.xml",
    siteUrl: "https://example.com/union",
    description: "Clubs, societies and student representation.",
    // Active but nothing published: triggers the empty-feed warning, and
    // is the case that actually matters to a subscriber, who receives an
    // empty channel without being told why.
    fetchedHoursAgo: 3,
    active: true,
    postCount: 0,
  },
  {
    title: "Archived: CSE2005 Announcements",
    url: "https://example.com/cse2005/archive.xml",
    siteUrl: "https://example.com/cse2005",
    description: "Retired subject feed, retained for reference.",
    // Deliberately paused rather than deleted - the reason Feed.active
    // exists at all, and it must NOT raise a warning.
    fetchedHoursAgo: 240,
    active: false,
    postCount: 3,
  },
];

const AUTHORS = [
  { name: "Gizem Erel", email: "22565725@latrobe.edu.au" },
  { name: "La Trobe Media Team", email: "media@latrobe.edu.au" },
  { name: "Tony De Souza-Daw", email: "a.desouza-daw@latrobe.edu.au" },
  { name: "Library Research Team", email: "library@latrobe.edu.au" },
  { name: "Student Union", email: "union@latrobe.edu.au" },
];

const CATEGORIES = [
  "Web Development",
  "RSS",
  "Databases",
  "University",
  "Cloud",
  "Accessibility",
  "Testing",
  "Events",
];

const TITLE_PARTS = {
  prefix: [
    "Getting started with",
    "A closer look at",
    "What changed in",
    "Notes on",
    "Common mistakes in",
    "Why we moved to",
    "Reading list:",
    "Workshop recap:",
  ],
  subject: [
    "feed aggregation",
    "container volumes",
    "database indexing",
    "accessibility testing",
    "load testing",
    "request tracing",
    "schema validation",
    "caching strategies",
    "semester enrolment",
    "referencing tools",
  ],
};

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateContent() {
  for (const author of AUTHORS) {
    await prisma.author.upsert({
      where: { name: author.name },
      update: {},
      create: author,
    });
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
  }

  const feedIds = [];

  for (const spec of FEEDS) {
    const lastFetchedAt = new Date(Date.now() - spec.fetchedHoursAgo * HOUR_MS);

    const feed = await prisma.feed.upsert({
      // url is unique, so re-running updates the same feed rather than
      // creating a duplicate every time.
      where: { url: spec.url },
      update: { lastFetchedAt, active: spec.active },
      create: {
        title: spec.title,
        url: spec.url,
        siteUrl: spec.siteUrl,
        description: spec.description,
        imageUrl: IMG(slugify(spec.title)),
        language: "en",
        active: spec.active,
        lastFetchedAt,
      },
    });

    feedIds.push(feed.id);

    for (let i = 0; i < spec.postCount; i++) {
      const title =
        pick(TITLE_PARTS.prefix) + " " + pick(TITLE_PARTS.subject);
      const guid = spec.url + "#sim-" + i;

      // Spread publication across the window, newest first, so the feed has
      // a believable history rather than everything arriving at once.
      const publishedAt = new Date(
        Date.now() - Math.floor((i / Math.max(1, spec.postCount)) * DAYS * DAY_MS) -
          between(0, 12) * HOUR_MS,
      );

      const author = pick(AUTHORS);
      const chosen = [pick(CATEGORIES), pick(CATEGORIES)];
      const categories = [...new Set(chosen)];

      await prisma.post.upsert({
        where: { guid },
        update: {},
        create: {
          title,
          description:
            "A short summary generated for the Assessment 3 dashboard, so per-feed counts and publication dates differ realistically.",
          content:
            "Full article body for " +
            title +
            ". This record exists to give the reporting views something to aggregate over time.",
          link: spec.siteUrl + "/" + slugify(title),
          imageUrl: IMG(slugify(title) + i),
          guid,
          publishedAt,
          feed: { connect: { id: feed.id } },
          author: {
            connectOrCreate: {
              where: { name: author.name },
              create: author,
            },
          },
          categories: {
            connectOrCreate: categories.map((name) => ({
              where: { name },
              create: { name, slug: slugify(name) },
            })),
          },
        },
      });
    }
  }

  return feedIds;
}

/* ------------------------------------------------------------------ *
 * Traffic
 * ------------------------------------------------------------------ */

/** Named callers, as a real deployment would see. */
const CLIENTS = [
  { id: "lms-portal", weight: 30 },
  { id: "mobile-app", weight: 22 },
  { id: "reader-bot", weight: 18 },
  { id: "campus-kiosk", weight: 10 },
  { id: "library-screen", weight: 6 },
];

/** Anonymous browsers, identified the way the API identifies them. */
const ANONYMOUS_IPS = [
  "203.0.113.14",
  "203.0.113.87",
  "198.51.100.23",
  "198.51.100.66",
];

const SALT = process.env.CLIENT_ID_SALT ?? "cse5006-rss-server";

function hashedClient(ip) {
  return (
    "ip_" +
    createHash("sha256")
      .update(SALT + ":" + ip)
      .digest("hex")
      .slice(0, 16)
  );
}

function weightedClient() {
  // One in five requests comes from an unidentified browser, which is what
  // makes the hashed-IP fallback visible on the dashboard rather than
  // theoretical.
  if (random() < 0.2) return hashedClient(pick(ANONYMOUS_IPS));

  const total = CLIENTS.reduce((sum, c) => sum + c.weight, 0);
  let roll = random() * total;
  for (const client of CLIENTS) {
    roll -= client.weight;
    if (roll <= 0) return client.id;
  }
  return CLIENTS[0].id;
}

const ENDPOINTS = [
  { path: "/rss.xml", weight: 34, feedScoped: false },
  { path: "/api/rss", weight: 10, feedScoped: true },
  { path: "/api/posts", weight: 24, feedScoped: true },
  { path: "/api/feeds", weight: 14, feedScoped: true },
  { path: "/api/health", weight: 10, feedScoped: false },
  { path: "/api/metrics", weight: 8, feedScoped: false },
];

function weightedEndpoint() {
  const total = ENDPOINTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = random() * total;
  for (const endpoint of ENDPOINTS) {
    roll -= endpoint.weight;
    if (roll <= 0) return endpoint;
  }
  return ENDPOINTS[0];
}

/**
 * Traffic is not uniform across the day, and a flat chart would look
 * obviously fake. This weights each hour to a rough campus rhythm: quiet
 * overnight, busy late morning, second peak in the evening.
 */
function hourWeight(hourOfDay) {
  const curve = [
    2, 1, 1, 1, 1, 2, 4, 8, 14, 20, 24, 22, 18, 17, 19, 21, 18, 14, 16, 19,
    17, 12, 7, 4,
  ];
  return curve[hourOfDay];
}

async function generateTraffic(feedIds) {
  const now = Date.now();
  const rows = [];

  for (let hoursAgo = HOURS - 1; hoursAgo >= 0; hoursAgo--) {
    const slotStart = now - hoursAgo * HOUR_MS;
    const hourOfDay = new Date(slotStart).getHours();
    const volume = Math.round(hourWeight(hourOfDay) * (0.7 + random() * 0.6));

    for (let i = 0; i < volume; i++) {
      const endpoint = weightedEndpoint();

      // Status codes are mostly success, with a realistic tail. The 4xx
      // rate is what makes the error-rate tile show a believable figure
      // instead of a permanent zero.
      let statusCode = 200;
      const roll = random();
      if (roll > 0.97) statusCode = 500;
      else if (roll > 0.93) statusCode = 404;
      else if (roll > 0.9) statusCode = 400;

      rows.push({
        method:
          endpoint.path === "/api/posts" && random() > 0.85 ? "POST" : "GET",
        path: endpoint.path,
        statusCode,
        // Errors resolve faster than successful work, which is usually true
        // and keeps the average response time honest.
        durationMs:
          statusCode >= 400 ? between(1, 12) : between(3, 90),
        clientId: weightedClient(),
        feedId:
          endpoint.feedScoped && feedIds.length > 0 && random() > 0.25
            ? pick(feedIds)
            : null,
        createdAt: new Date(slotStart + between(0, 59) * 60 * 1000),
      });
    }
  }

  // createMany in one call rather than a create per row: a few thousand
  // round trips to SQLite would take minutes.
  await prisma.requestLog.createMany({ data: rows });
  return rows.length;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main() {
  console.log("Simulating input records...");
  console.log(
    "  seed " + SEED + ", " + DAYS + " days content, " + HOURS + " hours traffic",
  );

  if (RESET) {
    const removed = await prisma.requestLog.deleteMany({});
    await prisma.metricSnapshot.deleteMany({});
    console.log("  reset: removed " + removed.count + " request log rows");
  }

  const feedIds = await generateContent();
  const requests = await generateTraffic(feedIds);

  const [feeds, posts, authors, categories, logs] = await Promise.all([
    prisma.feed.count(),
    prisma.post.count(),
    prisma.author.count(),
    prisma.category.count(),
    prisma.requestLog.count(),
  ]);

  const clients = await prisma.requestLog.groupBy({
    by: ["clientId"],
    where: { clientId: { not: null } },
  });

  console.log("  feeds:      " + feeds);
  console.log("  posts:      " + posts);
  console.log("  authors:    " + authors);
  console.log("  categories: " + categories);
  console.log("  requests:   " + logs + " (+" + requests + " this run)");
  console.log("  clients:    " + clients.length + " unique");
  console.log("Simulation complete.");
}

main()
  .catch((error) => {
    console.error("Simulation failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
