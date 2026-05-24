/**
 * coverage broker — forwards authenticated read requests to hq-x's
 * /api/v1/coverage/stats passthrough, which proxies on to data-engine-x.
 *
 * Mirrors the sam-opps / gtm-people pattern: platform-app sends the
 * user's Supabase access_token; `requireUser` validates it on this side.
 * We call hq-x with the BFF service token as the Authorization header
 * and forward the user JWT as `X-User-Bearer`.
 *
 * Routes:
 *   GET /stats → hq-x GET /api/v1/coverage/stats
 *
 * hq-x response status + body are passed through verbatim.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const coverageRoutes = new Hono<{ Variables: AuthVariables }>();

coverageRoutes.use("*", requireUser);

function userBearerFromRequest(c: { req: { header: (k: string) => string | undefined } }): string {
  // requireUser already validated the header; re-extract for forwarding.
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

coverageRoutes.get("/stats", async (c) => {
  const url = `${env.BACKEND_X_API_URL}/api/v1/coverage/stats`;
  const res = await fetch(url, {
    method: "GET",
    headers: backendHeaders(c),
  });
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  return new Response(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
});
