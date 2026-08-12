"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PostDetail from "@/Components/feeds/PostDetail";
import { api, toDisplayPost, type ApiPost } from "@/lib/api";
import { formatAuDateTime } from "@/lib/dates";
import type { Post } from "@/lib/types";

/**
 * In Assessment 1 this page searched a hardcoded array plus localStorage.
 * That breaks once posts come from the database: ids collide with the old
 * sample data, so a database post would render the WRONG article, and any
 * id beyond the sample set showed "Post not found".
 *
 * It now fetches the single record from the RSS Server by id.
 */
export default function PostPage() {
  const params = useParams();
  const id = Number(params?.id);

  const [post, setPost] = useState<Post | null>(null);
  const [raw, setRaw] = useState<ApiPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(id)) {
      setError("Invalid post id");
      setLoading(false);
      return;
    }

    api
      .posts()
      .then((rows) => {
        const match = rows.find((row) => row.id === id);
        if (!match) {
          setError("Post " + id + " was not found on the RSS Server.");
          return;
        }
        setRaw(match);
        setPost(toDisplayPost(match));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <p className="text-muted">Loading post from the RSS Server…</p>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          Post not found
        </h1>
        <p className="mb-4 text-muted">{error}</p>
        <Link href="/feeds" className="text-accent underline">
          Back to all feeds
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <PostDetail post={post} />

      {raw && (
        <section className="mt-6 flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Record details
          </h2>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm text-foreground">
            <dt className="text-muted">Feed</dt>
            <dd>{raw.feed?.title ?? "—"}</dd>
            <dt className="text-muted">Published</dt>
            <dd>{formatAuDateTime(raw.publishedAt)}</dd>
            <dt className="text-muted">Categories</dt>
            <dd>
              {raw.categories.length > 0
                ? raw.categories.map((category) => category.name).join(", ")
                : "—"}
            </dd>
            {raw.link && (
              <>
                <dt className="text-muted">Original</dt>
                <dd>
                  <a
                    href={raw.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline break-all"
                  >
                    {raw.link}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </main>
  );
}
