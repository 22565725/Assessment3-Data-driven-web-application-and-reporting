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
 * CRUD for posts - the articles inside a feed.
 *
 *   GET    /api/posts              all posts, newest first
 *   GET    /api/posts?id=1         one post
 *   GET    /api/posts?feedId=2     posts belonging to one feed
 *   GET    /api/posts?limit=5      cap the number returned
 *   POST   /api/posts              create   { title, feedId, ... }
 *   PATCH  /api/posts?id=1         partial update
 *   DELETE /api/posts?id=1         delete
 */

interface PostBody {
  title?: string;
  description?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
  guid?: string;
  publishedAt?: string;
  feedId?: number;
  /** Author NAME, not id - the API resolves or creates the Author row. */
  author?: string;
  /** Category names - resolved or created the same way. */
  categories?: string[];
}

/** "Web Development" -> "web-development" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const withRelations = {
  feed: { select: { id: true, title: true, url: true } },
  author: true,
  categories: true,
};

export async function OPTIONS() {
  return preflight();
}

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const params = request.nextUrl.searchParams;
    const hasId = params.has("id");
    const id = parseId(request);

    if (hasId && id === null) {
      return fail("id must be a positive integer", 400);
    }

    if (id !== null) {
      const post = await prisma.post.findUnique({
        where: { id },
        include: withRelations,
      });
      if (!post) return fail("Post " + id + " not found", 404);
      return ok(post);
    }

    const feedIdRaw = params.get("feedId");
    const limitRaw = params.get("limit");
    const feedId = feedIdRaw ? Number.parseInt(feedIdRaw, 10) : null;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;

    if (feedIdRaw && !Number.isInteger(feedId)) {
      return fail("feedId must be an integer", 400);
    }
    if (limitRaw && (!Number.isInteger(limit) || (limit as number) < 1)) {
      return fail("limit must be a positive integer", 400);
    }

    const posts = await prisma.post.findMany({
      where: feedId ? { feedId } : undefined,
      orderBy: { publishedAt: "desc" },
      take: limit ?? undefined,
      include: withRelations,
    });

    return ok(posts, 200, { count: posts.length });
  });
}

export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = await parseBody<PostBody>(request);
    if (!body) return fail("Request body must be valid JSON", 400);

    const missing = missingFields(body as Record<string, unknown>, [
      "title",
      "feedId",
    ]);
    if (missing.length > 0) {
      return fail("Missing required field(s): " + missing.join(", "), 400);
    }

    try {
      const post = await prisma.post.create({
        data: {
          title: body.title as string,
          description: body.description ?? null,
          content: body.content ?? null,
          link: body.link ?? null,
          imageUrl: body.imageUrl ?? null,
          guid: body.guid ?? null,
          publishedAt: body.publishedAt
            ? new Date(body.publishedAt)
            : new Date(),
          feed: { connect: { id: Number(body.feedId) } },
          // connectOrCreate means the client sends a name, not an id: reuse
          // the author if we know them, create the row if we do not.
          ...(body.author
            ? {
                author: {
                  connectOrCreate: {
                    where: { name: body.author },
                    create: { name: body.author },
                  },
                },
              }
            : {}),
          ...(body.categories && body.categories.length > 0
            ? {
                categories: {
                  connectOrCreate: body.categories.map((name) => ({
                    where: { name },
                    create: { name, slug: slugify(name) },
                  })),
                },
              }
            : {}),
        },
        include: withRelations,
      });
      return ok(post, 201);
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

    const body = await parseBody<PostBody>(request);
    if (!body) return fail("Request body must be valid JSON", 400);

    try {
      const post = await prisma.post.update({
        where: { id },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.content !== undefined && { content: body.content }),
          ...(body.link !== undefined && { link: body.link }),
          ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
          ...(body.publishedAt !== undefined && {
            publishedAt: new Date(body.publishedAt),
          }),
          ...(body.feedId !== undefined && {
            feed: { connect: { id: Number(body.feedId) } },
          }),
          ...(body.author !== undefined && {
            author: {
              connectOrCreate: {
                where: { name: body.author },
                create: { name: body.author },
              },
            },
          }),
          ...(body.categories !== undefined && {
            categories: {
              // `set: []` first clears existing links, so PATCH replaces the
              // category list rather than appending to it.
              set: [],
              connectOrCreate: body.categories.map((name) => ({
                where: { name },
                create: { name, slug: slugify(name) },
              })),
            },
          }),
        },
        include: withRelations,
      });
      return ok(post);
    } catch (error) {
      const mapped = prismaFail(error, "Post " + id + " not found");
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
      const post = await prisma.post.delete({ where: { id } });
      return ok({ deleted: true, post });
    } catch (error) {
      const mapped = prismaFail(error, "Post " + id + " not found");
      if (mapped) return mapped;
      throw error;
    }
  });
}
