import { NextRequest, NextResponse } from "next/server";
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
async function recordRequest(
  request: NextRequest,
  statusCode: number,
  durationMs: number,
): Promise<void> {
  try {
    await prisma.requestLog.create({
      data: {
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode,
        durationMs,
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
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = Date.now();
  let response: NextResponse;

  try {
    response = await fn();
  } catch (error) {
    console.error("[" + request.method + " " + request.url + "]", error);
    response = fail("Internal server error", 500);
  }

  await recordRequest(request, response.status, Date.now() - startedAt);
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

/** Returns the names of any required fields missing from a payload. */
export function missingFields(
  body: Record<string, unknown>,
  required: string[],
): string[] {
  return required.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });
}
