import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handle,
  ok,
  fail,
  preflight,
  parseId,
  parseBody,
  prismaFail,
} from "@/lib/http";
import { validate, feedCreateSchema, feedUpdateSchema } from "@/lib/validation";

/**
 * CRUD for RSS feeds - the subscriptions this server tracks.
 *
 *   GET    /api/feeds          list all feeds with a post count
 *   GET    /api/feeds?id=1     one feed including its posts
 *   POST   /api/feeds          create   { title, url, ... }
 *   PATCH  /api/feeds?id=1     partial update
 *   DELETE /api/feeds?id=1     delete (cascades to its posts)
 *
 * Payload shapes and their rules live in lib/validation.ts, so this file is
 * only concerned with talking to the database.
 */

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async (ctx) => {
    const hasId = request.nextUrl.searchParams.has("id");
    const id = parseId(request);

    if (hasId && id === null) {
      return fail("id must be a positive integer", 400);
    }

    if (id !== null) {
      ctx.feedId = id;
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
  return handle(request, async (ctx) => {
    const body = await parseBody<unknown>(request);
    if (body === null) return fail("Request body must be valid JSON", 400);

    const parsed = validate(feedCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    try {
      const feed = await prisma.feed.create({
        data: {
          title: data.title,
          url: data.url,
          siteUrl: data.siteUrl ?? null,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          language: data.language ?? "en",
          active: data.active ?? true,
        },
      });
      ctx.feedId = feed.id;
      return ok(feed, 201);
    } catch (error) {
      const mapped = prismaFail(error);
      if (mapped) return mapped;
      throw error;
    }
  });
}

export async function PATCH(request: NextRequest) {
  return handle(request, async (ctx) => {
    const id = parseId(request);
    if (id === null) {
      return fail("A valid ?id= query parameter is required", 400);
    }
    ctx.feedId = id;

    const body = await parseBody<unknown>(request);
    if (body === null) return fail("Request body must be valid JSON", 400);

    const parsed = validate(feedUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    try {
      // Only fields actually present in the payload are written, so a PATCH
      // sending just { active: false } does not blank out every other column.
      const feed = await prisma.feed.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.url !== undefined && { url: data.url }),
          ...(data.siteUrl !== undefined && { siteUrl: data.siteUrl }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.language !== undefined && { language: data.language }),
          ...(data.active !== undefined && { active: data.active }),
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
  return handle(request, async (ctx) => {
    const id = parseId(request);
    if (id === null) {
      return fail("A valid ?id= query parameter is required", 400);
    }
    ctx.feedId = id;

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
