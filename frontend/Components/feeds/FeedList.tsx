"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";

interface FeedListProps {
  posts: Post[];
  onDelete?: (id: number) => void;
  deletingId?: number | null;
}

/**
 * Assessment 1 merged posts held in localStorage into this list:
 *     const allPosts = [...savedPosts, ...posts];
 * Posts now live in the database, so that merge is gone - it would show
 * browser-only ghosts alongside real records, visible to nobody else.
 *
 * localStorage is still used here, but only for LAYOUT PREFERENCES. Whether
 * you prefer a grid or a list is genuinely per-browser and has no business
 * on a server.
 */
export default function FeedList({
  posts,
  onDelete,
  deletingId = null,
}: FeedListProps) {
  const [layout] = useLocalStorage<"grid" | "list">("feedLayout", "grid");
  const [showImages] = useLocalStorage<boolean>("feedShowImages", true);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredPosts = searchQuery.trim()
    ? posts.filter((post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : posts;

  const listClass =
    layout === "grid"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "flex flex-col gap-4";

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="feed-search" className="sr-only">
        Search posts by title
      </label>
      <input
        id="feed-search"
        type="search"
        placeholder="Search posts…"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground"
      />

      <p className="text-sm text-muted" aria-live="polite">
        Showing {filteredPosts.length} of {posts.length} posts
      </p>

      {filteredPosts.length === 0 ? (
        <p className="text-muted">No posts match your search.</p>
      ) : (
        <ul className={listClass}>
          {filteredPosts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                showImage={showImages}
                isExpanded={expandedId === post.id}
                onToggle={() =>
                  setExpandedId(expandedId === post.id ? null : post.id)
                }
                onDelete={onDelete}
                deleting={deletingId === post.id}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
