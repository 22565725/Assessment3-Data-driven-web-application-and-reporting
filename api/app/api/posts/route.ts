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
import { validate, postCreateSchema, postUpdateSchema } from "@/lib/validation";

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
 *
 * Payload shapes and their rules live in lib/validation.ts, so this file is
 * only concerned with talking to the database.
 */

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
    const body = await parseBody<unknown>(request);
    if (body === null) return fail("Request body must be valid JSON", 400);

    const parsed = validate(postCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    try {
      const post = await prisma.post.create({
        data: {
          title: data.title,
          description: data.description ?? null,
          content: data.content ?? null,
          link: data.link ?? null,
          imageUrl: data.imageUrl ?? null,
          guid: data.guid ?? null,
          // The schema already turned this into a Date.
          publishedAt: data.publishedAt ?? new Date(),
          feed: { connect: { id: data.feedId } },
          // connectOrCreate means the client sends a name, not an id: reuse
          // the author if we know them, create the row if we do not.
          ...(data.author
            ? {
                author: {
                  connectOrCreate: {
                    where: { name: data.author },
                    create: { name: data.author },
                  },
                },
              }
            : {}),
          ...(data.categories && data.categories.length > 0
            ? {
                categories: {
                  connectOrCreate: data.categories.map((name) => ({
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

    const body = await parseBody<unknown>(request);
    if (body === null) return fail("Request body must be valid JSON", 400);

    const parsed = validate(postUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = parsed.data;

    try {
      const post = await prisma.post.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.link !== undefined && { link: data.link }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.guid !== undefined && { guid: data.guid }),
          ...(data.publishedAt !== undefined && {
            publishedAt: data.publishedAt,
          }),
          ...(data.feedId !== undefined && {
            feed: { connect: { id: data.feedId } },
          }),
          // An explicit null means "remove the credit", which is a disconnect.
          // Sending it to connectOrCreate would try to create an author with
          // no name and fail on the NOT NULL constraint.
          ...(data.author !== undefined && {
            author:
              data.author === null
                ? { disconnect: true }
                : {
                    connectOrCreate: {
                      where: { name: data.author },
                      create: { name: data.author },
                    },
                  },
          }),
          ...(data.categories !== undefined && {
            categories: {
              // `set: []` first clears existing links, so PATCH replaces the
              // category list rather than appending to it.
              set: [],
              connectOrCreate: data.categories.map((name) => ({
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
