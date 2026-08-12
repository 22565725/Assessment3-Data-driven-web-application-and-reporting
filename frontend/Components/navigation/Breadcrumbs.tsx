"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  feeds: "Feeds",
  new: "New post",
  about: "About",
  settings: "Settings",
};

/* CHANGED for Assessment 2. This used to resolve /feeds/3 to the post's
   title by looking it up in the hardcoded data/posts array. Posts now come
   from the database, and their ids no longer line up with that array - so
   the lookup silently rendered the WRONG title for ids 1 to 5 and gave up
   entirely on anything higher.

   The crumb now shows the record id, which is always correct and matches
   what the URL actually addresses. */
function labelFor(segment: string, parent: string | undefined): string {
  if (LABELS[segment]) return LABELS[segment];

  if (parent === "feeds" && /^\d+$/.test(segment)) {
    return `Post ${segment}`;
  }

  return decodeURIComponent(segment);
}

/* Kept from Assessment 1: a crumb can be longer than its row on a narrow
   screen, so truncate the visible text and keep the full string in title=. */
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
