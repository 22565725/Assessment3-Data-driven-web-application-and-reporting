"use client";

import { useEffect, useState } from "react";

/**
 * Self-documenting landing page for the RSS Server.
 *
 * The base URL is read from the browser's own location rather than
 * hardcoded, so the examples below are always copy-pasteable regardless of
 * whether the server is running on localhost, a Docker-published port, or
 * an EC2 public DNS name that changes on every restart.
 */

interface Endpoint {
  method: string;
  path: string;
  purpose: string;
}

const crud: Endpoint[] = [
  { method: "GET", path: "/api/feeds", purpose: "All feeds, each with a post count" },
  { method: "GET", path: "/api/feeds?id=1", purpose: "One feed, including its posts" },
  { method: "POST", path: "/api/feeds", purpose: "Create a feed — requires title and url" },
  { method: "PATCH", path: "/api/feeds?id=1", purpose: "Partial update — only fields sent are changed" },
  { method: "DELETE", path: "/api/feeds?id=1", purpose: "Delete a feed, cascading to its posts" },
  { method: "GET", path: "/api/posts", purpose: "All posts, newest first, with relations" },
  { method: "GET", path: "/api/posts?feedId=1", purpose: "Posts belonging to one feed" },
  { method: "GET", path: "/api/posts?limit=5", purpose: "Cap the number returned" },
  { method: "POST", path: "/api/posts", purpose: "Create a post — requires title and feedId" },
  { method: "PATCH", path: "/api/posts?id=1", purpose: "Partial update" },
  { method: "DELETE", path: "/api/posts?id=1", purpose: "Delete a post" },
];

const operational: Endpoint[] = [
  { method: "GET", path: "/health", purpose: "Queries SQLite; returns 503 if unreachable" },
  { method: "GET", path: "/count", purpose: "Request totals, per-endpoint breakdown, content counts" },
];

const codes = [
  ["200", "OK — here is your data"],
  ["201", "Created — a new record exists"],
  ["400", "Bad request — a required field is missing or malformed"],
  ["404", "Not found — no record with that id"],
  ["409", "Conflict — that feed URL is already subscribed"],
  ["500", "Server error — something failed inside the API"],
  ["503", "Unavailable — the API is up but the database is not"],
];

function methodColour(method: string): string {
  if (method === "GET") return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";
  if (method === "POST") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (method === "PATCH") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
}

function Table({ rows, base }: { rows: Endpoint[]; base: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.method + row.path} className="border-b border-gray-200 dark:border-gray-800">
              <td className="py-2 pr-3 align-top">
                <span className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-semibold ${methodColour(row.method)}`}>
                  {row.method}
                </span>
              </td>
              <td className="py-2 pr-4 align-top font-mono text-xs break-all">
                {base}
                {row.path}
              </td>
              <td className="py-2 align-top text-gray-600 dark:text-gray-400">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Snippet({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-gray-100 p-3 text-xs leading-relaxed dark:bg-gray-900">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocumentation() {
  const [base, setBase] = useState("");

  useEffect(() => {
    setBase(window.location.origin.replace(/\/$/, ""));
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-6 sm:p-10">
      <header className="flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-gray-800">
        <p className="font-mono text-xs uppercase tracking-widest text-orange-600 dark:text-orange-400">
          CSE5006 Assessment 2
        </p>
        <h1 className="text-3xl font-semibold">RSS Server API</h1>
        <p className="max-w-2xl text-gray-600 dark:text-gray-400">
          REST API over a Prisma-managed SQLite database. Every response uses
          the same envelope: <code className="font-mono text-xs">{`{ success: true, data }`}</code> on
          success, <code className="font-mono text-xs">{`{ success: false, error }`}</code> on
          failure — so a client checks one field, every time.
        </p>
        <p className="font-mono text-xs text-gray-500">base url: {base || "…"}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">CRUD endpoints</h2>
        <Table rows={crud} base={base} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Operational endpoints</h2>
        <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          These are not about RSS. They are how an operator or a load balancer
          asks whether the service is alive and how busy it is, without knowing
          anything about the application. Both are also available under the{" "}
          <code className="font-mono text-xs">/api</code> prefix.
        </p>
        <Table rows={operational} base={base} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Status codes</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <tbody>
              {codes.map(([code, meaning]) => (
                <tr key={code} className="border-b border-gray-200 dark:border-gray-800">
                  <td className="py-2 pr-4 font-mono font-semibold">{code}</td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Examples — curl</h2>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Read all feeds</p>
          <Snippet>{`curl -s ${base}/api/feeds`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Create a feed</p>
          <Snippet>{`curl -X POST ${base}/api/feeds \\
  -H "Content-Type: application/json" \\
  -d '{"title":"ABC News","url":"https://abc.net.au/news/feed.xml"}'`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Create a post</p>
          <Snippet>{`curl -X POST ${base}/api/posts \\
  -H "Content-Type: application/json" \\
  -d '{"title":"New article","feedId":1,"author":"Gizem Erel","description":"Summary","categories":["RSS"]}'`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Update a post</p>
          <Snippet>{`curl -X PATCH "${base}/api/posts?id=1" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Updated title"}'`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Delete a post</p>
          <Snippet>{`curl -X DELETE "${base}/api/posts?id=1"`}</Snippet>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Examples — PowerShell</h2>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Read all feeds</p>
          <Snippet>{`Invoke-RestMethod -Uri "${base}/api/feeds" -Method Get`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Create a post</p>
          <Snippet>{`$body = '{"title":"New article","feedId":1,"author":"Gizem Erel"}'
Invoke-RestMethod -Uri "${base}/api/posts" -Method Post -Body $body -ContentType "application/json"`}</Snippet>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Delete a post</p>
          <Snippet>{`Invoke-RestMethod -Uri "${base}/api/posts?id=1" -Method Delete`}</Snippet>
        </div>
      </section>

      <footer className="border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800">
        Gizem Erel · 22565725 · RSS Server running in Docker
      </footer>
    </main>
  );
}
