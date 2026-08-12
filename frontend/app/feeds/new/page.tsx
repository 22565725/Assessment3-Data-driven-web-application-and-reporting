import PostForm from "@/Components/feeds/PostForm";

export default function NewPostPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Add a new post
      </h1>
      <p className="mb-4 text-muted">
        Submitting this form sends a POST request to the RSS Server, which
        stores the record in SQLite.
      </p>
      <PostForm mode="create" />
    </main>
  );
}
