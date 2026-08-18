"use client";

import { useEffect, useState } from "react";
import { resolveRssUrl } from "@/lib/api";

/**
 * Shows the address of the published RSS feed and lets the reader open or
 * copy it.
 *
 * This is the visible half of the RSS output. The <link rel="alternate">
 * tag in the layout is what machines use; this is what a person uses, and
 * it is also the quickest way to demonstrate that the server publishes a
 * real feed rather than only storing feed-shaped records.
 *
 * The URL is resolved after mount rather than during render: it depends on
 * window.location, which does not exist on the server, and rendering a
 * different value on each side would be a hydration mismatch.
 */
export default function SubscribeLink({ feedId }: { feedId?: number }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(resolveRssUrl(feedId));
  }, [feedId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access needs a secure context, which plain http on an EC2
      // public IP is not. The address is on screen either way.
      setCopied(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">
            Subscribe to this feed
          </h2>
          <p className="text-sm text-muted">
            The RSS Server publishes a standards-compliant RSS 2.0 document.
            Paste this address into any feed reader.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground hover:bg-accent-hover"
          >
            Open RSS feed
          </a>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!url}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy URL"}
          </button>
        </div>
      </div>

      <code className="mt-3 block break-all rounded-md bg-background px-3 py-2 font-mono text-sm text-muted">
        {url || "Resolving feed address…"}
      </code>
    </section>
  );
}
