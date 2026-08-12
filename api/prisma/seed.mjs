/**
 * Seed script for the RSS Server database.  Run:  npm run db:seed
 *
 * Every write is an upsert keyed on a unique column, so running this twice
 * produces the same database rather than duplicate rows. That matters
 * because the Docker entrypoint runs it on container start.
 *
 * The first feed carries the five posts written for Assessment 1, so the
 * move from a hardcoded array to a relational database is visible in the
 * same content.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Assessment 1 stored dates as "DD/MM/YYYY" strings. */
function parseDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split("/").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
}

const authors = [
  { name: "Gizem Erel", email: "22565725@latrobe.edu.au", bio: "CSE5006 student building an RSS aggregation server." },
  { name: "La Trobe Media Team", email: "media@latrobe.edu.au", bio: "University announcements and news." },
  { name: "Tony De Souza-Daw", email: "a.desouza-daw@latrobe.edu.au", bio: "Subject coordinator, CSE5006." },
];

const categories = [
  { name: "Web Development", slug: "web-development" },
  { name: "RSS", slug: "rss" },
  { name: "Databases", slug: "databases" },
  { name: "University", slug: "university" },
  { name: "Cloud", slug: "cloud" },
];

const IMG = "https://media.geeksforgeeks.org/wp-content/uploads/20211213172224/1.png";

const feeds = [
  {
    title: "CSE5006 Project Blog",
    url: "https://example.com/cse5006/feed.xml",
    siteUrl: "https://example.com/cse5006",
    description: "Development notes from the CSE5006 RSS server project, carried over from the Assessment 1 frontend.",
    imageUrl: IMG,
    posts: [
      {
        title: "What an RSS feed actually is",
        description: "RSS is a plain XML document that a website republishes whenever it posts something new. Each item carries a title, a link, a publication date and a summary, which is exactly the shape this interface is built around.",
        content: "RSS is an XML document a site republishes whenever new content appears. Each <item> carries a title, link, pubDate and description. Because the format is fixed, one reader can subscribe to thousands of unrelated sites and render them identically. That predictability is what makes an aggregator possible: the server needs to know nothing about a publisher's HTML, only how to parse the same handful of XML elements.",
        link: "https://example.com/cse5006/what-is-rss",
        imageUrl: IMG,
        date: "12/07/2026",
        author: "Gizem Erel",
        categories: ["RSS", "Web Development"],
      },
      {
        title: "Why an LMS wants a feed reader",
        description: "Course coordinators currently paste links into announcements by hand. Pulling the same material through a feed means one subscription updates every enrolled student automatically.",
        content: "Coordinators copy links into announcements by hand, once per subject, every week. A feed subscription inverts that: subscribe once, and every enrolled student receives new material automatically. The saving compounds across subjects, and the audit trail improves because the server records exactly when each item arrived.",
        link: "https://example.com/cse5006/lms-feed-reader",
        imageUrl: "https://media.geeksforgeeks.org/wp-content/uploads/20211213172225/2.png",
        date: "14/07/2026",
        author: "Gizem Erel",
        categories: ["RSS", "University"],
      },
      {
        title: "Sourcing content from a feed URL",
        description: "In Assessment 2 the server polls each subscribed URL, parses the XML, and stores new items. This screen is the front end that work plugs into.",
        content: "The import endpoint fetches a feed URL, parses the XML, and upserts each item keyed on its guid. Keying on guid rather than title means re-importing updates existing rows instead of duplicating them, so the endpoint is safe to call on a schedule.",
        link: "https://example.com/cse5006/sourcing-content",
        imageUrl: "https://media.geeksforgeeks.org/wp-content/uploads/20211213172226/3.png",
        date: "18/07/2026",
        author: "Gizem Erel",
        categories: ["RSS", "Databases"],
      },
      {
        title: "Designing cards for quick scanning",
        description: "Readers skim feeds rather than read them. Titles carry the most weight, dates and authors sit in a lighter colour, and summaries truncate until the reader asks for more.",
        content: "Feed readers are skimmed, not read. The card layout reflects that: the title takes the strongest typographic weight, metadata recedes, and the summary truncates after a few lines. The full body is one click away on the detail page, now served from the database rather than a local array.",
        link: "https://example.com/cse5006/designing-cards",
        imageUrl: "https://media.geeksforgeeks.org/wp-content/uploads/20211213172227/4.png",
        date: "20/07/2026",
        author: "Gizem Erel",
        categories: ["Web Development"],
      },
      {
        title: "From localStorage to a real database",
        description: "Assessment 1 kept posts in the browser, so nothing was shared between visitors and nothing survived a cleared cache. Assessment 2 moves that state onto the server.",
        content: "Assessment 1 stored posts in localStorage: private to one browser, lost when the cache cleared, invisible to anyone else. Moving that state into SQLite behind an API makes the data shared, durable and queryable. That same change is what lets the operational endpoints report meaningful counts, because there is finally a single source of truth to count.",
        link: "https://example.com/cse5006/localstorage-to-database",
        imageUrl: "https://media.geeksforgeeks.org/wp-content/uploads/20211213172229/5.png",
        date: "23/07/2026",
        author: "Gizem Erel",
        categories: ["Databases", "Web Development"],
      },
    ],
  },
  {
    title: "CSE5006 Subject Announcements",
    url: "https://example.com/cse5006/announcements.xml",
    siteUrl: "https://example.com/cse5006/announcements",
    description: "Assessment reminders and weekly workshop notes.",
    imageUrl: "https://picsum.photos/seed/cse5006/600/400",
    posts: [
      {
        title: "Assessment 2 due - backend, API and database",
        description: "Submissions must include an ORM-managed schema, CRUD endpoints, health and count endpoints, and a Dockerised build.",
        content: "Assessment 2 requires a working backend: an ORM-managed schema, CRUD endpoints the frontend actually calls, operational endpoints for health and request counts, and a Docker image that runs the whole thing reproducibly.",
        link: "https://example.com/cse5006/assessment-2",
        imageUrl: "https://picsum.photos/seed/assessment/600/400",
        date: "28/07/2026",
        author: "Tony De Souza-Daw",
        categories: ["University", "Web Development"],
      },
      {
        title: "Workshop 7 recap: Docker volumes and SQLite",
        description: "A container's filesystem is disposable. Anything you want to keep has to live on a mounted volume.",
        content: "Container filesystems are ephemeral. A SQLite file written inside the container disappears the moment the image is rebuilt. Mounting a named volume at the database directory is what turns a demo into something that survives a restart.",
        link: "https://example.com/cse5006/workshop-7-recap",
        imageUrl: "https://picsum.photos/seed/docker/600/400",
        date: "04/08/2026",
        author: "Tony De Souza-Daw",
        categories: ["Cloud", "Databases"],
      },
    ],
  },
];

async function main() {
  console.log("Seeding RSS Server database...");

  for (const a of authors) {
    await prisma.author.upsert({ where: { name: a.name }, update: a, create: a });
  }
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  let postCount = 0;

  for (const { posts, ...feedData } of feeds) {
    const feed = await prisma.feed.upsert({
      where: { url: feedData.url },
      update: feedData,
      create: feedData,
    });

    for (const p of posts) {
      const { author, categories: cats, date, ...rest } = p;
      const authorRow = await prisma.author.findUnique({ where: { name: author } });
      const guid = feed.url + "#" + rest.link;

      await prisma.post.upsert({
        where: { guid },
        update: {
          ...rest,
          publishedAt: parseDate(date),
          feedId: feed.id,
          authorId: authorRow?.id ?? null,
          categories: { set: cats.map((name) => ({ name })) },
        },
        create: {
          ...rest,
          guid,
          publishedAt: parseDate(date),
          feedId: feed.id,
          authorId: authorRow?.id ?? null,
          categories: { connect: cats.map((name) => ({ name })) },
        },
      });
      postCount += 1;
    }
  }

  console.log("  authors:    " + authors.length);
  console.log("  categories: " + categories.length);
  console.log("  feeds:      " + feeds.length);
  console.log("  posts:      " + postCount);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
