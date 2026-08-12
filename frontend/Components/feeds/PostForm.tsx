"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type ApiFeed, type ApiPost } from "@/lib/api";

/**
 * One form, two modes.
 *
 * Assessment 1's version wrote straight to localStorage with a hand-rolled
 * id counter. It now POSTs or PATCHes to the RSS Server, and the database
 * assigns the id.
 *
 * Note the author and category fields take NAMES, not ids: the API resolves
 * them with connectOrCreate, so the form never has to create an author
 * first and read its id back.
 */

interface PostFormProps {
  mode: "create" | "edit";
  postId?: number;
}

const fieldClass =
  "rounded-md border border-border bg-surface px-3 py-2 text-foreground";

export default function PostForm({ mode, postId }: PostFormProps) {
  const router = useRouter();

  const [feeds, setFeeds] = useState<ApiFeed[]>([]);
  const [feedId, setFeedId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categories, setCategories] = useState("");

  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .feeds()
      .then((rows) => {
        setFeeds(rows);
        if (mode === "create" && rows.length > 0) {
          setFeedId(String(rows[0].id));
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !postId) return;

    api
      .posts()
      .then((rows) => {
        const post: ApiPost | undefined = rows.find((row) => row.id === postId);
        if (!post) {
          setError("Post " + postId + " was not found.");
          return;
        }
        setTitle(post.title);
        setAuthor(post.author?.name ?? "");
        setDescription(post.description ?? "");
        setContent(post.content ?? "");
        setLink(post.link ?? "");
        setImageUrl(post.imageUrl ?? "");
        setCategories(post.categories.map((c) => c.name).join(", "));
        setFeedId(String(post.feed?.id ?? ""));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, postId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const categoryList = categories
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      title,
      description,
      content: content || null,
      link: link || null,
      imageUrl: imageUrl || null,
      author: author || undefined,
      categories: categoryList,
      feedId: Number(feedId),
    };

    try {
      if (mode === "create") {
        await api.createPost(payload);
      } else if (postId) {
        await api.updatePost(postId, payload);
      }
      router.push("/feeds");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted">Loading post…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      {error && (
        <p className="rounded-md border border-border bg-surface p-3 text-foreground">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="feedId" className="text-sm text-muted">
          Feed
        </label>
        <select
          id="feedId"
          required
          value={feedId}
          className={fieldClass}
          onChange={(event) => setFeedId(event.target.value)}
        >
          <option value="" disabled>
            Select a feed…
          </option>
          {feeds.map((feed) => (
            <option key={feed.id} value={feed.id}>
              {feed.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm text-muted">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          className={fieldClass}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="author" className="text-sm text-muted">
          Author
        </label>
        <input
          id="author"
          value={author}
          className={fieldClass}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-muted">
          Summary
        </label>
        <textarea
          id="description"
          required
          rows={3}
          value={description}
          className={fieldClass}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm text-muted">
          Full article (optional)
        </label>
        <textarea
          id="content"
          rows={5}
          value={content}
          className={fieldClass}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="link" className="text-sm text-muted">
          Original article URL (optional)
        </label>
        <input
          id="link"
          type="url"
          value={link}
          className={fieldClass}
          onChange={(event) => setLink(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imageUrl" className="text-sm text-muted">
          Image URL (optional)
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          className={fieldClass}
          onChange={(event) => setImageUrl(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categories" className="text-sm text-muted">
          Categories (comma separated)
        </label>
        <input
          id="categories"
          value={categories}
          placeholder="RSS, Databases"
          className={fieldClass}
          onChange={(event) => setCategories(event.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-md bg-accent px-4 py-2 text-accent-foreground disabled:opacity-50"
      >
        {saving
          ? "Saving…"
          : mode === "create"
            ? "Create post"
            : "Save changes"}
      </button>
    </form>
  );
}
