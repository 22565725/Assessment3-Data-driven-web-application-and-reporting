"use client";

import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { posts as seedPosts } from "@/data/posts";
import type { Post } from "@/lib/types";

export default function LatestFeeds({ limit = 4 }: { limit?: number }) {
  const [savedPosts] = useLocalStorage<Post[]>("myData", []);

  const latest = [...savedPosts, ...seedPosts]
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);

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