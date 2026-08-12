import NewPostForm from "@/Components/feeds/NewPostForm";

export default function NewPostPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">
        Add a new post
      </h1>
      <NewPostForm />
    </main>
  );
}