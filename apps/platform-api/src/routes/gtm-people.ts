/**
 * gtm-people broker — forwards read-only requests to backend-engine
 * (hq-x), which queries gtm.people directly.
 *
 * Same auth shape as sam-opps: requireUser validates the incoming user
 * JWT; we then call hq-x with the BFF service token as Authorization.
 * X-User-Bearer is sent for parity but hq-x's gtm-people router doesn't
 * scope by user — gtm data is operator-grade.
 *
 * Routes:
 *   GET /            → hq-x GET /api/v1/gtm/people (forwards query string)
 *
 * Sources for the UI's dropdown are derived from row payloads — every
 * row carries its own `source` value, so a separate /sources endpoint
 * isn't needed.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const gtmPeopleRoutes = new Hono<{ Variables: AuthVariables }>();

gtmPeopleRoutes.use("*", requireUser);

function userBearerFromRequest(c: { req: { header: (k: string) => string | undefined } }): string {
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader) {
    throw new HTTPException(401, { message: "Missing bearer token (post-auth)" });
  }
  return authHeader;
}

function backendHeaders(c: { req: { header: (k: string) => string | undefined } }) {
  return {
    Authorization: `Bearer ${env.BACKEND_X_SERVICE_TOKEN}`,
    "X-User-Bearer": userBearerFromRequest(c),
  };
}

async function forwardGet(upstreamUrl: string, headers: Record<string, string>) {
  const res = await fetch(upstreamUrl, { method: "GET", headers });
  const body = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  return new Response(body, { status: res.status, headers: { "content-type": contentType } });
}

gtmPeopleRoutes.get("/", async (c) => {
  const qs = c.req.url.split("?")[1] ?? "";
  const url = `${env.BACKEND_X_API_URL}/api/v1/gtm/people${qs ? `?${qs}` : ""}`;
  return forwardGet(url, backendHeaders(c));
});
