/**
 * Request validation schemas and DTOs.
 *
 * Assessment 2 checked payloads inline in each route with missingFields(),
 * which only answered "is this key present?". Nothing stopped a client
 * storing `url: "not-a-url"`, `publishedAt: "yesterday"`, or a 40,000
 * character title - and because the RSS endpoints publish those values into
 * an XML document that external readers parse, bad input stops being a
 * cosmetic problem and starts producing a broken feed.
 *
 * So validation is centralised here as reusable Zod schemas. Three things
 * fall out of that:
 *
 *   1. One definition per field. The rule for "a URL we will store" is
 *      written once and reused by feeds, posts and every future route.
 *   2. The DTO types are inferred from the schemas with z.infer, so the
 *      TypeScript type and the runtime check can never drift apart - which
 *      is exactly what a hand-written interface plus a hand-written check
 *      cannot guarantee.
 *   3. Errors come back field by field, so the client can mark the offending
 *      input rather than showing one vague message.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/http";

/* ------------------------------------------------------------------ *
 * Field primitives - the reusable vocabulary
 * ------------------------------------------------------------------ */

const LIMITS = {
  title: 300,
  url: 2048,
  description: 5_000,
  content: 100_000,
  name: 200,
  guid: 500,
  categories: 25,
} as const;

/**
 * Accepts only absolute http(s) URLs.
 *
 * `new URL()` does the parsing, then the protocol is checked explicitly:
 * URL() alone happily accepts "javascript:alert(1)" and "file:///etc/passwd",
 * neither of which belongs in a link we publish to subscribers.
 */
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const httpUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(LIMITS.url, `${label} must be ${LIMITS.url} characters or fewer`)
    .refine(isHttpUrl, `${label} must be an absolute http:// or https:// URL`);

/** Required, non-blank text with an upper bound. */
const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} must not be empty`)
    .max(max, `${label} must be ${max} characters or fewer`);

/**
 * An HTML form submits a cleared field as "", and the RSS Client sends
 * `null` for the same thing. Both mean "no value", so both normalise to
 * null before validation rather than being rejected as a malformed string.
 */
const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = (label: string, max: number) =>
  z.preprocess(blankToNull, text(label, max).nullable().optional());

const optionalUrl = (label: string) =>
  z.preprocess(blankToNull, httpUrl(label).nullable().optional());

/**
 * A date the client supplied as a string. Date.parse accepts ISO-8601 and
 * RFC-822, which covers both what our own API returns and what an imported
 * RSS <pubDate> looks like. The schema outputs a real Date, so routes hand
 * Prisma a Date rather than re-parsing the string themselves.
 */
const dateString = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => !Number.isNaN(Date.parse(value)),
      `${label} must be a valid date (ISO-8601, e.g. 2026-08-16T09:00:00Z)`,
    )
    .transform((value) => new Date(value));

/**
 * A BCP-47 language subtag, which is what RSS <language> expects:
 * "en", or "en-AU" with an optional region.
 */
const languageCode = z
  .string()
  .trim()
  .regex(
    /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/i,
    'language must be a code such as "en" or "en-AU"',
  );

/**
 * feedId arrives as a number from JSON but as a string from a query string
 * or a <select> value, so it is coerced before the integer check.
 */
const positiveInt = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .positive(`${label} must be greater than zero`);

const categoryNames = z
  .array(text("category name", LIMITS.name))
  .max(
    LIMITS.categories,
    `a post may have at most ${LIMITS.categories} categories`,
  );

/* ------------------------------------------------------------------ *
 * Feed schemas
 * ------------------------------------------------------------------ */

/**
 * strictObject rejects unknown keys instead of silently dropping them, so a
 * client that misspells "discription" is told about it rather than being
 * left to wonder why the field never saved.
 */
export const feedCreateSchema = z.strictObject({
  title: text("title", LIMITS.title),
  url: httpUrl("url"),
  siteUrl: optionalUrl("siteUrl"),
  description: optionalText("description", LIMITS.description),
  imageUrl: optionalUrl("imageUrl"),
  language: languageCode.optional(),
  active: z.boolean().optional(),
});

/**
 * PATCH is a partial update, so every field becomes optional - but an empty
 * body is still a client mistake, not a no-op worth a 200.
 */
export const feedUpdateSchema = feedCreateSchema
  .partial()
  .refine(
    (body) => Object.keys(body).length > 0,
    "Provide at least one field to update",
  );

/* ------------------------------------------------------------------ *
 * Post schemas
 * ------------------------------------------------------------------ */

export const postCreateSchema = z.strictObject({
  title: text("title", LIMITS.title),
  feedId: positiveInt("feedId"),
  description: optionalText("description", LIMITS.description),
  content: optionalText("content", LIMITS.content),
  link: optionalUrl("link"),
  imageUrl: optionalUrl("imageUrl"),
  /** RSS <guid>. Free-form by spec - it need not be a URL. */
  guid: optionalText("guid", LIMITS.guid),
  publishedAt: dateString("publishedAt").optional(),
  /** Author NAME, not id - the route resolves it with connectOrCreate. */
  author: optionalText("author", LIMITS.name),
  categories: categoryNames.optional(),
});

export const postUpdateSchema = postCreateSchema
  .partial()
  .refine(
    (body) => Object.keys(body).length > 0,
    "Provide at least one field to update",
  );

/* ------------------------------------------------------------------ *
 * Inferred DTOs
 * ------------------------------------------------------------------ */

/** Note these are the schemas' OUTPUT types: publishedAt is a Date here,
 *  because dateString transforms the incoming string. */
export type FeedCreateDto = z.infer<typeof feedCreateSchema>;
export type FeedUpdateDto = z.infer<typeof feedUpdateSchema>;
export type PostCreateDto = z.infer<typeof postCreateSchema>;
export type PostUpdateDto = z.infer<typeof postUpdateSchema>;

/* ------------------------------------------------------------------ *
 * The route-facing helper
 * ------------------------------------------------------------------ */

/** One issue per offending field, in the shape the RSS Client renders. */
export interface FieldError {
  field: string;
  message: string;
}

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Runs a schema and, on failure, returns the finished 400 response so a
 * route can simply do:
 *
 *   const parsed = validate(postCreateSchema, body);
 *   if (!parsed.ok) return parsed.response;
 *
 * safeParse is used rather than parse because a validation failure is an
 * expected outcome for a public API, not an exception.
 */
export function validate<S extends z.ZodType>(
  schema: S,
  payload: unknown,
): Validated<z.infer<S>> {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: FieldError[] = result.error.issues.map((issue) => ({
    // A top-level refinement (an empty PATCH body) has an empty path.
    field: issue.path.length > 0 ? issue.path.join(".") : "body",
    message: issue.message,
  }));

  return {
    ok: false,
    response: fail("Validation failed", 400, errors),
  };
}
