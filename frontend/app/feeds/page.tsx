import FeedList from "@/Components/feeds/FeedList";
import { posts } from "@/data/posts";

export default function FeedsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">Feeds</h1>
      <FeedList posts={posts} />
    </main>
  );
}