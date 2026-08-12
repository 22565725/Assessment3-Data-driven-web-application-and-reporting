"use client";

import { useParams } from "next/navigation";
import PostForm from "@/Components/feeds/PostForm";

export default function EditPostPage() {
  const params = useParams();
  const id = Number(params?.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Edit post {Number.isInteger(id) ? id : ""}
      </h1>
      <p className="mb-4 text-muted">
        Saving sends a PATCH request to the RSS Server. Only the fields you
        change are written.
      </p>
      {Number.isInteger(id) ? (
        <PostForm mode="edit" postId={id} />
      ) : (
        <p className="text-muted">Invalid post id.</p>
      )}
    </main>
  );
}
