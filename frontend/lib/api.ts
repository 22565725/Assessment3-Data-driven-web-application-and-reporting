/**
 * Client for the RSS Server.
 *
 * All backend access goes through this one module, so the base URL, the
 * response envelope and error handling live in one place.
 */

import type { Post } from "@/lib/types";
import { formatAuDate } from "@/lib/dates";

const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "4080";

/**
 * Works out where the RSS Server is.
 *
 * The RSS Client and RSS Server run on the same machine, on different
 * ports, so the browser can derive the server's address from the address
 * it already loaded this page from. That matters on AWS: a Learner Lab
 * instance gets a NEW public IP every time it is stopped and started, and
 * hardcoding it means editing config and rebuilding after every restart.
 *
 * NEXT_PUBLIC_API_URL still overrides everything, for the case where the
 * server genuinely lives on a different host.
 */
export function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return (
      window.location.protocol + "//" + window.location.hostname + ":" + API_PORT
    );
  }
  // Server-side rendering fallback.
  return "http://localhost:" + API_PORT;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { count?: number };
  error?: { message: string };
}

export interface ApiAuthor {
  id: number;
  name: string;
  email: string | null;
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ApiPost {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  link: string | null;
  imageUrl: string | null;
  publishedAt: string;
  feed: { id: number; title: string; url: string } | null;
  author: ApiAuthor | null;
  categories: ApiCategory[];
}

export interface ApiFeed {
  id: number;
  title: string;
  url: string;
  siteUrl: string | null;
  description: string | null;
  imageUrl: string | null;
  language: string;
  active: boolean;
  createdAt: string;
  _count?: { posts: number };
}

export interface HealthResponse {
  status: string;
  service: string;
  uptimeSeconds: number;
  database: { connected: boolean; provider: string; latencyMs: number };
  environment: string;
}

export interface CountResponse {
  uptimeSeconds: number;
  requests: {
    total: number;
    last24Hours: number;
    errors: number;
    errorRate: number;
    byMethod: { method: string; count: number }[];
    byEndpoint: {
      path: string;
      count: number;
      averageDurationMs: number | null;
    }[];
  };
  content: {
    feeds: number;
    activeFeeds: number;
    posts: number;
    authors: number;
    categories: number;
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl() + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.success) {
    throw new Error(
      body.error?.message ?? "Request failed with status " + response.status,
    );
  }

  return body.data;
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  count: () => request<CountResponse>("/api/count"),
  feeds: () => request<ApiFeed[]>("/api/feeds"),
  posts: (feedId?: number) =>
    request<ApiPost[]>("/api/posts" + (feedId ? "?feedId=" + feedId : "")),
  createPost: (payload: Record<string, unknown>) =>
    request<ApiPost>("/api/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePost: (id: number, payload: Record<string, unknown>) =>
    request<ApiPost>("/api/posts?id=" + id, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePost: (id: number) =>
    request<{ deleted: boolean }>("/api/posts?id=" + id, { method: "DELETE" }),
  createFeed: (payload: Record<string, unknown>) =>
    request<ApiFeed>("/api/feeds", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteFeed: (id: number) =>
    request<{ deleted: boolean }>("/api/feeds?id=" + id, { method: "DELETE" }),
};

/**
 * Adapts a database post to the flat shape the Assessment 1 components
 * already expect. This is why PostCard and FeedList did not change when the
 * data source moved from a hardcoded array to the API.
 */
export function toDisplayPost(post: ApiPost): Post {
  return {
    id: post.id,
    title: post.title,
    description: post.description ?? post.content ?? "",
    author: post.author?.name ?? "Unknown",
    date: formatAuDate(post.publishedAt),
    imageUrl: post.imageUrl ?? "",
  };
}
