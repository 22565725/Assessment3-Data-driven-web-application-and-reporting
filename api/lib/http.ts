import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Shared HTTP helpers for every route in the RSS Server.
 *
 * Two goals:
 *  1. Every endpoint returns the SAME response envelope, so the RSS Client
 *     never has to guess the shape of what came back.
 *  2. Cross-cutting concerns - CORS, timing, error handling, request
 *     logging - are written once here rather than copied into each route.
 */

/**
 * The RSS Client runs on a different port to the RSS Server (80 vs 4080),
 * which makes every browser call cross-origin. Without these headers the
 * browser discards the response before the client's JavaScript sees it.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export interface ApiMeta {
  count?: number;
  [key: string]: unknown;
}

/** Success: { success: true, data: ... } */
export function ok<T>(data: T, status = 200, meta?: ApiMeta): NextResponse {
  return NextResponse.json(
    meta ? { success: true, data, meta } : { success: true, data },
    { status, headers: corsHeaders },
  );
}

/** Failure: { success: false, error: { message, details? } } */
export function fail(
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { success: false, error: details ? { message, details } : { message } },
    { status, headers: corsHeaders },
  );
}

/** Answers the browser's CORS preflight. Every route re-exports this. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Writes one row per request into the RequestLog table, which is what
 * GET /api/count reads.
 *
 * Best-effort by design: if the insert fails we log and carry on, because
 * telemetry must never be the reason a user's request fails.
 */
/**
 * Salt for client hashing. Overridable per deployment so the same IP does not
 * produce the same key across environments.
 */
const CLIENT_ID_SALT = process.env.CLIENT_ID_SALT ?? "cse5006-rss-server";

/**
 * Works out who is calling, without storing who is calling.
 *
 * Two sources, in order:
 *
 *  1. An X-Client-Id header, if the caller sends one. This is what makes load
 *     testing meaningful: JMeter runs from a single machine, so without it
 *     ten thousand simulated clients would share one IP and the "unique
 *     clients" metric would report 1. It is also how real APIs identify
 *     callers, via a key rather than a network address.
 *
 *  2. Otherwise a salted SHA-256 of the IP, truncated. An IP address is
 *     personal data, and counting distinct callers never requires knowing
 *     who they are - only whether two requests came from the same someone.
 *     Hashing keeps the metric and discards the identity.
 *
 * Returns null when neither is available, which is honest: a missing client
 * is better than a wrong one.
 */
function resolveClientId(request: NextRequest): string | null {
  const declared = request.headers.get("x-client-id");
  if (declared) return declared.trim().slice(0, 64);

  // x-forwarded-for is a comma-separated chain; the original client is first.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip");

  if (!ip) return null;

  const digest = createHash("sha256")
    .update(CLIENT_ID_SALT + ":" + ip)
    .digest("hex");

  return "ip_" + digest.slice(0, 16);
}

/**
 * Per-request scratch space a handler can write to, so the logger can record
 * things only the handler knows.
 *
 * Chiefly feedId: handle() sees a URL, and cannot tell that
 * /api/posts?feedId=2 and /api/feeds?id=2 both concern feed 2 while
 * /api/posts?id=2 concerns a post. Sniffing query parameters here would
 * break the moment one is renamed, so each route states it outright.
 */
export interface RequestContext {
  feedId?: number | null;
}

async function recordRequest(
  request: NextRequest,
  statusCode: number,
  durationMs: number,
  context: RequestContext,
): Promise<void> {
  try {
    await prisma.requestLog.create({
      data: {
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode,
        durationMs,
        clientId: resolveClientId(request),
        feedId: context.feedId ?? null,
      },
    });
  } catch (error) {
    console.error("[requestLog] failed to record request:", error);
  }
}

/**
 * Wraps a route handler with timing, request logging and a last-resort
 * error boundary, so an unexpected throw returns clean JSON rather than an
 * HTML error page the client cannot parse.
 */
export async function handle(
  request: NextRequest,
  fn: (context: RequestContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = Date.now();
  // Handlers that have nothing extra to report simply ignore this argument,
  // which is why every existing route kept working unchanged.
  const context: RequestContext = {};
  let response: NextResponse;

  try {
    response = await fn(context);
  } catch (error) {
    console.error("[" + request.method + " " + request.url + "]", error);
    response = fail("Internal server error", 500);
  }

  await recordRequest(request, response.status, Date.now() - startedAt, context);
  return response;
}

/**
 * Translates the Prisma error codes we expect into meaningful HTTP
 * responses. Without this a duplicate feed URL would surface as a generic
 * 500, which is both unhelpful and wrong - that is a client error.
 *
 * Returns null for anything unrecognised so the caller can rethrow.
 */
export function prismaFail(
  error: unknown,
  notFoundMessage = "Record not found",
): NextResponse | null {
  const code = (error as { code?: string })?.code;

  switch (code) {
    case "P2025":
      return fail(notFoundMessage, 404);
    case "P2002": {
      const target = (error as { meta?: { target?: string[] | string } })?.meta
        ?.target;
      const field = Array.isArray(target) ? target.join(", ") : target;
      return fail(
        field
          ? "A record with this " + field + " already exists"
          : "A record with these details already exists",
        409,
      );
    }
    case "P2003":
      return fail("Referenced record does not exist", 400);
    default:
      return null;
  }
}

/**
 * Reads and validates the ?id= query parameter used by every single-record
 * route. Query strings are used rather than dynamic [id] segments to match
 * the Workshop 5 and 7 API convention.
 */
export function parseId(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("id");
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Safely parses a JSON body, returning null instead of throwing. */
export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * A non-JSON response, used by the RSS endpoint - the one route that must
 * return an XML document rather than the { success, data } envelope,
 * because it is consumed by feed readers rather than by our own client.
 *
 * Cache-Control matters here in a way it does not elsewhere: readers poll a
 * feed on a timer, and without a cache window a popular feed would hit the
 * database on every poll from every subscriber.
 */
export function xml(
  body: string,
  contentType: string,
  cacheSeconds = 300,
): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control":
        "public, max-age=" + cacheSeconds + ", stale-while-revalidate=60",
    },
  });
}
