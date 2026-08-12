import type { Post } from "@/lib/types";

export default function PostDetail({ post }: { post: Post }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
        src={post.imageUrl}
         alt={post.title} 
         className="mx-auto max-h-96 w-full bg-background object-contain"
         />
        <div className="flex flex-col gap-3 p-6">
            <h1 className="text-2xl font-semibold text-foreground">
                {post.title}</h1>
            <p className="text-sm text-muted">
                {post.author} . {post.date}
            </p>
            <p className="text-foreground">{post.description}</p>
        </div>
    </article>
  );
}