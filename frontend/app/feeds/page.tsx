"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FeedList from "@/Components/feeds/FeedList";
import SubscribeLink from "@/Components/feeds/SubscribeLink";
import { api, toDisplayPost } from "@/lib/api";
import type { Post } from "@/lib/types";

/**
 * Assessment 1 imported a hardcoded array here. Every post on this page now
 * comes from the RSS Server, and Delete issues a real DELETE request.
 */
export default function FeedsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    return api
      .posts()
      .then((rows) => {
        setPosts(rows.map(toDisplayPost));
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete post " + id + "? This cannot be undone.")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deletePost(id);
      // Refetch rather than splicing local state, so what you see is what
      // the database actually contains.
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Feeds</h1>
        <Link
          href="/feeds/new"
          className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:bg-accent-hover"
        >
          + New post
        </Link>
      </div>

      <div className="mb-6">
        <SubscribeLink />
      </div>

      {loading && (
        <p className="text-muted">Loading posts from the RSS Server…</p>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-border bg-surface p-4 text-foreground">
          Could not reach the RSS Server: {error}
        </p>
      )}

      {!loading && (
        <FeedList
          posts={posts}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}
    </main>
  );
}
