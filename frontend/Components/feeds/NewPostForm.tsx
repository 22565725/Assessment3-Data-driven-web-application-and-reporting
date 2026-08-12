"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/types";
import { posts as seedPosts } from "@/data/posts";

const FALLBACK_IMAGE =
  "https://media.geeksforgeeks.org/wp-content/uploads/20211213172224/1.png";

export default function NewPostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const stored = localStorage.getItem("myData");
    let saved: Post[] = [];
    if (stored) {
      try {
        saved = JSON.parse(stored) as Post[];
      } catch (error) {
        console.error("Could not read saved posts:", error);
      }
    }
    const existingIds = [...saved, ...seedPosts].map((post) => post.id);
    const nextId = Math.max(0, ...existingIds) + 1;

    const newPost: Post = {
      id: nextId,
      title,
      author,
      description,
      date: new Date().toLocaleDateString(),
      imageUrl: imageUrl.trim() === "" ? FALLBACK_IMAGE : imageUrl,
    };

    localStorage.setItem("myData", JSON.stringify([...saved, newPost]));
    router.push("/feeds");
  };

  const fieldClass =
    "rounded-md border border-border bg-surface px-3 py-2 text-foreground";

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-muted">Title</label>
        <input id="title" required value={title} className={fieldClass}
          onChange={(event) => setTitle(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="author" className="text-sm text-muted">Author</label>
        <input id="author" required value={author} className={fieldClass}
          onChange={(event) => setAuthor(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">Description</label>
        <textarea id="description" required rows={5} value={description} className={fieldClass}
          onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imageUrl" className="text-sm text-muted">Image URL (optional)</label>
        <input id="imageUrl" type="url" value={imageUrl} className={fieldClass}
          onChange={(event) => setImageUrl(event.target.value)} />
      </div>

      <button type="submit"
        className="self-start rounded-md bg-accent px-4 py-2 text-accent-foreground">
        Add post
      </button>
    </form>
  );
}