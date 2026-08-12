import Link from "next/link";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggle: () => void;
  showImage?: boolean;
  /** Supplied only where editing makes sense; the card works without it. */
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

export default function PostCard({
  post,
  isExpanded,
  onToggle,
  showImage = true,
  onDelete,
  deleting = false,
}: PostCardProps) {
  return (
    /* Assessment 1: "use Cards rather than bricks". A resting shadow so it
       sits above the page, a deeper shadow and small lift on hover so it
       responds, and a divider under the image so the media reads as its own
       region. object-contain is deliberate - posts show their full image
       rather than being cropped. */
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {showImage && post.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.imageUrl}
          alt={post.title}
          className="aspect-[14/9] w-full border-b border-border bg-background object-contain"
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>

        <p className="text-sm text-muted">
          {post.author} · {post.date}
        </p>

        <p className="text-foreground">
          {isExpanded
            ? post.description
            : `${post.description.substring(0, 80)}…`}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>

          <Link
            href={`/feeds/${post.id}`}
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Read more
          </Link>

          {onDelete && (
            <>
              <Link
                href={`/feeds/${post.id}/edit`}
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Edit
              </Link>

              <button
                type="button"
                onClick={() => onDelete(post.id)}
                disabled={deleting}
                className="rounded-md border border-border px-3 py-2 text-sm text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 dark:text-red-400"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
