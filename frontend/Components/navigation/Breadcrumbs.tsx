"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { posts } from "@/data/posts";

const LABELS: Record<string, string> = {
  feeds: "Feeds",
  new: "New post",
  about: "About",
  settings: "Settings",
};

/* ADDED: a URL segment is not a label. /feeds/3 used to render as
   "Home / Feeds / 3", showing the reader a database id that means nothing to
   them. Look the title up instead.

   LIMITATION, stated deliberately: only the sample posts can be resolved here.
   Posts the user created live in localStorage, which does not exist during
   server rendering — reading it here would either cause a hydration mismatch
   or need a setState-in-effect, the same anti-pattern the linter flags in
   useLocalStorage.ts. Those fall back to "Post 7", which is honest and never
   renders a wrong title. */
function labelFor(segment: string, parent: string | undefined): string {
  if (LABELS[segment]) return LABELS[segment];

  if (parent === "feeds" && /^\d+$/.test(segment)) {
    const post = posts.find((item) => item.id === Number(segment));
    return post ? post.title : `Post ${segment}`;
  }

  return decodeURIComponent(segment);
}

/* ADDED: "careful with long paths". A post title can be far longer than a URL
   slug, so a resolved breadcrumb can overflow its row on a narrow screen.
   Truncate the visible text; the full string stays available via title=. */
const MAX_LABEL = 32;

function truncate(text: string): string {
  return text.length > MAX_LABEL
    ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…`
    : text;
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-5xl px-4 pt-4">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <li>
          <Link href="/" className="hover:text-accent">
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = labelFor(segment, segments[index - 1]);
          const shortLabel = truncate(label);
          // Only expose title= when the text was actually cut, so hovering an
          // untruncated crumb does not pop a tooltip repeating what is on screen.
          const fullText = shortLabel === label ? undefined : label;

          return (
            <li key={href} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span
                  className="text-foreground"
                  aria-current="page"
                  title={fullText}
                >
                  {shortLabel}
                </span>
              ) : (
                <Link
                  href={href}
                  className="transition-colors hover:text-accent"
                  title={fullText}
                >
                  {shortLabel}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}