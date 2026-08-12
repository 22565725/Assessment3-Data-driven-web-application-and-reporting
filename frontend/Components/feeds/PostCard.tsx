import Link from "next/link";
import type { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggle: () => void;
  showImage?: boolean;
}

export default function PostCard({
  post,
  isExpanded,
  onToggle,
  showImage = true,
}: PostCardProps) {
  return (
    /* CHANGED: "use Cards rather than bricks". A card is a surface that sits
       ABOVE the page and reacts to the pointer; the old version was a flat
       outlined rectangle, which is what made it read as a brick. Three things
       do the work: a resting shadow (it sits above), a deeper shadow plus a
       small lift on hover (it responds), and a divider under the image (a
       distinct media region rather than one undifferentiated block).
       NOT changed: object-contain. Commits 6ca087e and 3461b50 chose to show
       posts' full images instead of cropping them — that is a decision, so the
       card frame changes around it and the image fit stays as it was. */
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {showImage && (
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
        </div>
      </div>
    </article>
  );
}