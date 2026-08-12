"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, toDisplayPost } from "@/lib/api";
import type { Post } from "@/lib/types";

/**
 * Assessment 1 built this list from localStorage plus the hardcoded
 * data/posts array, which meant the home page kept showing sample content
 * after the real data moved to the database. It now reads the most recent
 * posts from the RSS Server.
 */
export default function LatestFeeds({ limit = 4 }: { limit?: number }) {
  const [latest, setLatest] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .posts()
      .then((rows) => setLatest(rows.slice(0, limit).map(toDisplayPost)))
      .catch((err: Error) => setError(err.message));
  }, [limit]);

  return (
    <aside
      aria-labelledby="latest-heading"
      className="h-fit rounded-lg border border-border bg-surface p-4"
    >
      <h2
        id="latest-heading"
        className="mb-3 text-lg font-semibold text-foreground"
      >
        Latest in your feed
      </h2>

      {error && <p className="text-sm text-muted">RSS Server unavailable.</p>}

      {!error && latest.length === 0 && (
        <p className="text-sm text-muted">No posts yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {latest.map((post) => (
          <li
            key={post.id}
            className="border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <Link
              href={`/feeds/${post.id}`}
              className="font-medium text-foreground hover:text-accent"
            >
              {post.title}
            </Link>
            <p className="text-sm text-muted">
              {post.author} · {post.date}
            </p>
          </li>
        ))}
      </ul>

      <Link
        href="/feeds"
        className="mt-4 inline-block text-sm text-accent hover:underline"
      >
        View all feeds →
      </Link>
    </aside>
  );
}
