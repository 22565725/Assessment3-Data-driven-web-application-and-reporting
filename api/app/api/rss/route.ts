import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, fail, preflight, xml } from "@/lib/http";
import {
  buildRssFeed,
  RSS_CONTENT_TYPE,
  type RssChannelInput,
  type RssItemInput,
} from "@/lib/rss";

/**
 * The published RSS feed - the endpoint an external reader subscribes to.
 *
 *   GET /api/rss              every post from every ACTIVE feed
 *   GET /api/rss?feedId=1     one feed republished on its own
 *   GET /api/rss?limit=20     cap the number of items
 *
 * Also reachable at /rss.xml and /feed.xml, which are the conventional
 * locations a reader or a browser extension looks for. Those are rewrites
 * in next.config.ts rather than duplicate route files, matching how
 * /health and /count already alias their /api equivalents.
 *
 * This is the difference between storing feed records and being a feed:
 * every other endpoint answers our own client in JSON, this one answers
 * anybody's reader in XML.
 */

/** Readers poll on a timer; more than this per request helps nobody. */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function OPTIONS() {
  return preflight();
}

/**
 * The absolute URL this document was requested at, for <atom:link rel="self">.
 *
 * Rebuilt from the request rather than hardcoded because the deployment
 * address is not knowable at build time - the Learner Lab hands out a new
 * public IP on every restart, which is the same reason the RSS Client
 * derives the API host from window.location.
 */
function requestOrigin(request: NextRequest): string {
  // Host is what the CLIENT asked for. request.url is what the SERVER sees,
  // and inside a container those differ: Docker maps public 4080 to internal
  // 3000, so request.url reports localhost:3000 and the feed would advertise
  // an address no subscriber could reach.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? proto + "://" + host : new URL(request.url).origin;
}

function selfUrl(request: NextRequest): string {
  const url = new URL(request.url);
  // Reflect only the parameters that actually shape the document.
  const params = new URLSearchParams();
  for (const key of ["feedId", "limit"]) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return requestOrigin(request) + url.pathname + (query ? "?" + query : "");
}

/** The site the aggregate feed describes. */
function siteUrl(request: NextRequest): string {
  return process.env.PUBLIC_SITE_URL ?? requestOrigin(request);
}

export async function GET(request: NextRequest) {
  return handle(request, async (ctx) => {
    const params = request.nextUrl.searchParams;

    const feedIdRaw = params.get("feedId");
    const limitRaw = params.get("limit");

    let feedId: number | null = null;
    if (feedIdRaw !== null) {
      const parsed = Number.parseInt(feedIdRaw, 10);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return fail("feedId must be a positive integer", 400);
      }
      feedId = parsed;
      // A single-feed request is attributable; the aggregate feed is not.
      ctx.feedId = parsed;
    }

    let limit = DEFAULT_LIMIT;
    if (limitRaw !== null) {
      const parsed = Number.parseInt(limitRaw, 10);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return fail("limit must be a positive integer", 400);
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    // A named feed is fetched first so a bad id is a 404 with a JSON error,
    // rather than a valid-looking but empty XML document that a reader would
    // silently accept as "this feed has no posts".
    const feed =
      feedId !== null
        ? await prisma.feed.findUnique({ where: { id: feedId } })
        : null;

    if (feedId !== null && !feed) {
      return fail("Feed " + feedId + " not found", 404);
    }

    const posts = await prisma.post.findMany({
      where:
        feedId !== null
          ? { feedId }
          : // The aggregate feed honours the `active` switch: pausing a feed
            // should stop republishing it without deleting anything.
            { feed: { active: true } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: {
        author: { select: { name: true, email: true } },
        categories: { select: { name: true } },
        feed: { select: { title: true, url: true, siteUrl: true } },
      },
    });

    const site = siteUrl(request);

    const channel: RssChannelInput = feed
      ? {
          title: feed.title,
          link: feed.siteUrl ?? feed.url,
          description:
            feed.description ?? "Posts published by " + feed.title + ".",
          language: feed.language,
          imageUrl: feed.imageUrl,
          selfUrl: selfUrl(request),
        }
      : {
          title: "CSE5006 RSS Server",
          link: site,
          description:
            "Every post aggregated by the CSE5006 RSS Server, newest first, " +
            "across all active feeds.",
          language: "en",
          selfUrl: selfUrl(request),
        };

    const items: RssItemInput[] = posts.map((post) => ({
      title: post.title,
      link: post.link,
      description: post.description,
      content: post.content,
      guid: post.guid,
      publishedAt: post.publishedAt,
      authorName: post.author?.name ?? null,
      authorEmail: post.author?.email ?? null,
      categories: post.categories.map((category) => category.name),
      imageUrl: post.imageUrl,
      // Only worth stating when the channel mixes several feeds together.
      sourceTitle: feed ? null : post.feed.title,
      sourceUrl: feed ? null : post.feed.url,
    }));

    return xml(buildRssFeed(channel, items), RSS_CONTENT_TYPE);
  });
}
