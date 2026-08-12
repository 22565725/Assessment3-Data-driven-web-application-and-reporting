"use client";

import { useEffect, useState } from "react";
import FeedList from "@/Components/feeds/FeedList";
import { api, toDisplayPost } from "@/lib/api";
import type { Post } from "@/lib/types";

/**
 * In Assessment 1 this page imported a hardcoded array:
 *     import { posts } from "@/data/posts";
 * It now fetches the same shape from the RSS Server. FeedList and PostCard
 * are unchanged - toDisplayPost adapts the database records to the flat
 * type those components already expect.
 */
export default function FeedsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .posts()
      .then((rows) => setPosts(rows.map(toDisplayPost)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Feeds</h1>

      {loading && (
        <p className="text-muted">Loading posts from the RSS Server…</p>
      )}

      {error && (
        <p className="rounded-md border border-border bg-surface p-4 text-foreground">
          Could not reach the RSS Server: {error}
        </p>
      )}

      {!loading && !error && <FeedList posts={posts} />}
    </main>
  );
}
