import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handle,
  ok,
  fail,
  preflight,
  parseId,
  parseBody,
  missingFields,
  prismaFail,
} from "@/lib/http";

/**
 * CRUD for RSS feeds - the subscriptions this server tracks.
 *
 *   GET    /api/feeds          list all feeds with a post count
 *   GET    /api/feeds?id=1     one feed including its posts
 *   POST   /api/feeds          create   { title, url, ... }
 *   PATCH  /api/feeds?id=1     partial update
 *   DELETE /api/feeds?id=1     delete (cascades to its posts)
 */

interface FeedBody {
  title?: string;
  url?: string;
  siteUrl?: string;
  description?: string;
  imageUrl?: string;
  language?: string;
  active?: boolean;
}

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const hasId = request.nextUrl.searchParams.has("id");
    const id = parseId(request);

    if (hasId && id === null) {
      return fail("id must be a positive integer", 400);
    }

    if (id !== null) {
      const feed = await prisma.feed.findUnique({
        where: { id },
        include: {
          posts: {
            orderBy: { publishedAt: "desc" },
            include: { author: true, categories: true },
          },
        },
      });
      if (!feed) return fail("Feed " + id + " not found", 404);
      return ok(feed);
    }

    // _count asks SQLite to count related posts in the same query rather
    // than loading every post just to measure the list length.
    const feeds = await prisma.feed.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return ok(feeds, 200, { count: feeds.length });
  });
}

export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = await parseBody<FeedBody>(request);
    if (!body) return fail("Request body must be valid JSON", 400);

    const missing = missingFields(body as Record<string, unknown>, [
      "title",
      "url",
    ]);
    if (missing.length > 0) {
      return fail("Missing required field(s): " + missing.join(", "), 400);
    }

    try {
      const feed = await prisma.feed.create({
        data: {
          title: body.title as string,
          url: body.url as string,
          siteUrl: body.siteUrl ?? null,
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
          language: body.language ?? "en",
          active: body.active ?? true,
        },
      });
      return ok(feed, 201);
    } catch (error) {
      const mapped = prismaFail(error);
      if (mapped) return mapped;
      throw error;
    }
  });
}

export async function PATCH(request: NextRequest) {
  return handle(request, async () => {
    const id = parseId(request);
    if (id === null) {
      return fail("A valid ?id= query parameter is required", 400);
    }

    const body = await parseBody<FeedBody>(request);
    if (!body) return fail("Request body must be valid JSON", 400);

    try {
      // Only fields actually present in the payload are written, so a PATCH
      // sending just { active: false } does not blank out every other column.
      const feed = await prisma.feed.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.url !== undefined && { url: body.url }),
          ...(body.siteUrl !== undefined && { siteUrl: body.siteUrl }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
          ...(body.language !== undefined && { language: body.language }),
          ...(body.active !== undefined && { active: body.active }),
        },
      });
      return ok(feed);
    } catch (error) {
      const mapped = prismaFail(error, "Feed " + id + " not found");
      if (mapped) return mapped;
      throw error;
    }
  });
}

export async function DELETE(request: NextRequest) {
  return handle(request, async () => {
    const id = parseId(request);
    if (id === null) {
      return fail("A valid ?id= query parameter is required", 400);
    }

    try {
      // onDelete: Cascade in the schema removes this feed's posts too.
      const feed = await prisma.feed.delete({ where: { id } });
      return ok({ deleted: true, feed });
    } catch (error) {
      const mapped = prismaFail(error, "Feed " + id + " not found");
      if (mapped) return mapped;
      throw error;
    }
  });
}
