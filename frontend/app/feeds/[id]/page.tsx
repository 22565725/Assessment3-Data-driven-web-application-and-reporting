"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import PostDetail from "@/Components/feeds/PostDetail";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { posts } from "@/data/posts";
import type { Post } from "@/lib/types";

export default function PostPage() {
  const params = useParams();
  const id = Number(params?.id);

  /* CHANGED: this page used to hand-roll its own localStorage read — getItem,
     JSON.parse, try/catch, setState in a useEffect, plus an isLoaded flag. That
     was a second copy of useLocalStorage that had drifted from the original, and
     it carried the same set-state-in-effect problem the linter flagged.
     One hook, used everywhere, is one place to fix things. */
  const [savedPosts, , isLoaded] = useLocalStorage<Post[]>("myData", []);

  const post: Post | null =
    [...savedPosts, ...posts].find((item) => item.id === id) ?? null;

  /* Order matters. Checking for the post BEFORE checking isLoaded means the five
     sample posts render immediately — they come from a static import, so the
     server can find them and there is nothing to wait for. Only a post that is
     genuinely absent from that set has to wait for localStorage to be readable. */
  if (post) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <PostDetail post={post} />
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Post not found
      </h1>
      <Link href="/feeds" className="text-accent underline">
        Back to all feeds
      </Link>
    </main>
  );
}
