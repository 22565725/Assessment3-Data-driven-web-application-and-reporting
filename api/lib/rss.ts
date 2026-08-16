/**
 * RSS 2.0 document generation.
 *
 * This is the piece that makes the RSS Server an RSS server rather than a
 * content database with RSS-flavoured table names. Everything else in this
 * project stores feed and post records; this module turns those records
 * back into the XML document an external reader actually subscribes to.
 *
 * The output targets the RSS 2.0 specification at
 * https://www.rssboard.org/rss-specification, plus three namespaced
 * extensions that the specification itself does not cover:
 *
 *   atom:     <atom:link rel="self"> - the spec has no way for a document
 *             to state its own canonical URL, and validators warn without
 *             it. Atom's link element is the accepted fix.
 *   dc:       <dc:creator> - RSS 2.0's own <author> element is REQUIRED to
 *             contain an email address. Most of our authors only have a
 *             display name, and putting a bare name in <author> produces an
 *             invalid feed, so Dublin Core carries the name instead.
 *   media:    <media:content> - <enclosure> requires a byte length we do
 *             not know without fetching every image. Media RSS does not,
 *             and readers understand it just as well.
 */

/** Every RSS response is served with this. Not text/xml - readers sniff it. */
export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";

/** Characters that must never appear raw in XML text or attributes. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * XML 1.0 forbids most control characters outright - a single 0x00 that
 * arrived through the API would make the whole document unparseable, and a
 * reader would drop the entire feed rather than one item.
 *
 * Allowed through: tab (09), newline (0A), carriage return (0D), and
 * everything from 0x20 upwards except DEL.
 */
function stripInvalidXmlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Wraps post bodies, which legitimately contain HTML, in CDATA so the
 * markup survives instead of being escaped into visible tag soup.
 *
 * The one sequence CDATA cannot contain is its own terminator, so any "]]>"
 * in the content is split across two CDATA sections. Concatenated by the
 * parser this reproduces the original text exactly.
 */
function cdata(value: string): string {
  return "<![CDATA[" + value.split("]]>").join("]]]]><![CDATA[>") + "]]>";
}

/**
 * RSS 2.0 requires RFC-822 dates ("Sat, 16 Aug 2026 09:00:00 GMT").
 *
 * Date.prototype.toUTCString is specified by ECMA-262 to emit exactly that
 * form, in English, regardless of the server's locale - which a
 * toLocaleString call would not guarantee inside a container set to any
 * other region.
 */
export function toRfc822(date: Date): string {
  return date.toUTCString();
}

/** <tag>escaped text</tag>, omitted entirely when the value is empty. */
function tag(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return (
    "<" + name + ">" + escapeXml(stripInvalidXmlChars(value)) + "</" + name + ">"
  );
}

/** <tag><![CDATA[ raw html ]]></tag>, omitted when empty. */
function rawTag(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return "<" + name + ">" + cdata(stripInvalidXmlChars(value)) + "</" + name + ">";
}

/** Renders name="escaped value" pairs, skipping empty ones. */
function attrs(pairs: Record<string, string | null | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        " " + k + '="' + escapeXml(stripInvalidXmlChars(v as string)) + '"',
    )
    .join("");
}

export interface RssItemInput {
  title: string;
  link?: string | null;
  /** Short summary shown in the reader's list view. */
  description?: string | null;
  /** Full article body, emitted as content:encoded when present. */
  content?: string | null;
  /** Stable unique identifier. Falls back to the item link, then to a
   *  server-generated tag: URI, so every item always has a guid. */
  guid?: string | null;
  publishedAt: Date;
  authorName?: string | null;
  authorEmail?: string | null;
  categories?: string[];
  imageUrl?: string | null;
  /** The feed this item came from - only meaningful in the aggregate feed. */
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}

export interface RssChannelInput {
  title: string;
  /** The human-readable site this feed describes. */
  link: string;
  description: string;
  language?: string;
  imageUrl?: string | null;
  /** This document's own canonical URL, for <atom:link rel="self">. */
  selfUrl: string;
  /** Defaults to the newest item's date, or now for an empty channel. */
  lastBuildDate?: Date;
  /** How many minutes a reader may cache before re-polling. */
  ttlMinutes?: number;
  copyright?: string | null;
  /** Identifies this server in the generated document. */
  generator?: string;
}

const DEFAULT_GENERATOR = "CSE5006 RSS Server (Next.js + Prisma)";

/**
 * Builds one <item>. Every branch is a deliberate spec decision - see the
 * namespace notes at the top of the file.
 */
function buildItem(item: RssItemInput, index: number): string {
  const parts: string[] = [];

  parts.push(rawTag("title", item.title));

  if (item.link) parts.push(tag("link", item.link));

  parts.push(rawTag("description", item.description));

  // content:encoded carries the full body. Readers that support it show the
  // whole article; those that do not fall back to <description>.
  if (item.content && item.content !== item.description) {
    parts.push(rawTag("content:encoded", item.content));
  }

  // A guid must be unique and stable so a reader can tell "already seen"
  // from "new".
  //
  // isPermaLink="true" is a promise that the guid can be opened as a web
  // page, so it is only claimed when the guid IS the item's own link.
  // "Starts with https://" is not enough: an RSS <guid> is often a URL-shaped
  // identifier that resolves to nothing, and a reader that follows one lands
  // on a 404.
  const guidValue =
    item.guid ?? item.link ?? "tag:cse5006-rss-server,item-" + index;
  const isPermaLink =
    item.link && guidValue === item.link && /^https?:\/\//i.test(guidValue)
      ? "true"
      : "false";
  parts.push(
    "<guid" +
      attrs({ isPermaLink }) +
      ">" +
      escapeXml(stripInvalidXmlChars(guidValue)) +
      "</guid>",
  );

  parts.push(tag("pubDate", toRfc822(item.publishedAt)));

  // <author> is only valid with an email address; dc:creator carries the
  // display name in every other case.
  if (item.authorEmail && item.authorName) {
    parts.push(tag("author", item.authorEmail + " (" + item.authorName + ")"));
  } else if (item.authorEmail) {
    parts.push(tag("author", item.authorEmail));
  }
  if (item.authorName) parts.push(rawTag("dc:creator", item.authorName));

  for (const category of item.categories ?? []) {
    parts.push(rawTag("category", category));
  }

  if (item.imageUrl) {
    parts.push(
      "<media:content" + attrs({ url: item.imageUrl, medium: "image" }) + " />",
    );
  }

  // In the aggregate feed an item's originating feed is not obvious, so
  // <source> names it. The url attribute is required by the spec.
  if (item.sourceTitle && item.sourceUrl) {
    parts.push(
      "<source" +
        attrs({ url: item.sourceUrl }) +
        ">" +
        escapeXml(stripInvalidXmlChars(item.sourceTitle)) +
        "</source>",
    );
  }

  return (
    "    <item>\n      " + parts.filter(Boolean).join("\n      ") + "\n    </item>"
  );
}

/**
 * Assembles a complete, standards-compliant RSS 2.0 document.
 *
 * Returns a string rather than a Response so it can be unit tested without
 * an HTTP layer, and reused by any route that wants to serve it.
 */
export function buildRssFeed(
  channel: RssChannelInput,
  items: RssItemInput[],
): string {
  // lastBuildDate should reflect the content, not the clock: an unchanged
  // feed that reports "now" on every poll defeats reader-side caching.
  const lastBuild =
    channel.lastBuildDate ??
    (items.length > 0
      ? new Date(Math.max(...items.map((i) => i.publishedAt.getTime())))
      : new Date());

  const head: string[] = [
    rawTag("title", channel.title),
    tag("link", channel.link),
    rawTag("description", channel.description),
    tag("language", channel.language ?? "en"),
    tag("lastBuildDate", toRfc822(lastBuild)),
    tag("pubDate", toRfc822(lastBuild)),
    tag("generator", channel.generator ?? DEFAULT_GENERATOR),
    // Points readers at the spec this document follows.
    tag("docs", "https://www.rssboard.org/rss-specification"),
    tag("ttl", String(channel.ttlMinutes ?? 60)),
    tag("copyright", channel.copyright),
    // The self-reference the RSS spec itself lacks.
    "<atom:link" +
      attrs({
        href: channel.selfUrl,
        rel: "self",
        type: "application/rss+xml",
      }) +
      " />",
  ];

  if (channel.imageUrl) {
    // Channel <image> requires all three children, and <title>/<link> are
    // specified to repeat the channel's own values.
    head.push(
      "<image>\n      " +
        tag("url", channel.imageUrl) +
        "\n      " +
        rawTag("title", channel.title) +
        "\n      " +
        tag("link", channel.link) +
        "\n    </image>",
    );
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0"' +
    ' xmlns:atom="http://www.w3.org/2005/Atom"' +
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
    ' xmlns:content="http://purl.org/rss/1.0/modules/content/"' +
    ' xmlns:media="http://search.yahoo.com/mrss/">\n' +
    "  <channel>\n    " +
    head.filter(Boolean).join("\n    ") +
    "\n" +
    (items.length > 0
      ? items.map(buildItem).join("\n") + "\n"
      : "    <!-- No published items yet. -->\n") +
    "  </channel>\n" +
    "</rss>\n"
  );
}
