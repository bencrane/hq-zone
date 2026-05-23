/**
 * sam-opps broker — forwards authenticated requests to backend-engine,
 * which proxies on to data-engine-x.
 *
 * platform-app sends the user's Supabase access_token on every request;
 * `requireUser` validates it on this side. We then call backend-engine
 * with the BFF service token as the Authorization header, and forward
 * the user JWT as `X-User-Bearer` so backend-engine can scope the
 * request to the right user.
 *
 * Routes:
 *   GET  /:notice_id      → backend-engine GET  /api/v1/sam-opps/:notice_id
 *   POST /search          → backend-engine POST /api/v1/sam-opps/search
 *   POST /stats           → backend-engine POST /api/v1/sam-opps/stats
 *
 * backend-engine response status + body are passed through verbatim
 * (including error envelopes). The BFF synthesizes nothing — validation
 * lives downstream.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const samOppsRoutes = new Hono<{ Variables: AuthVariables }>();

samOppsRoutes.use("*", requireUser);

function userBearerFromRequest(c: { req: { header: (k: string) => string | undefined } }): string {
  // requireUser already validated the header; re-extract for forwarding.
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader) {
    throw new HTTPException(401, { message: "Missing bearer token (post-auth)" });
  }
  return authHeader;
}

function backendHeaders(c: { req: { header: (k: string) => string | undefined } }, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${env.BACKEND_X_SERVICE_TOKEN}`,
    "X-User-Bearer": userBearerFromRequest(c),
    ...(extra ?? {}),
  };
}

async function forwardJson(upstreamUrl: string, init: RequestInit) {
  const res = await fetch(upstreamUrl, init);
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  return { status: res.status, body: text, contentType };
}

samOppsRoutes.get("/:notice_id", async (c) => {
  const noticeId = c.req.param("notice_id");
  const url = `${env.BACKEND_X_API_URL}/api/v1/sam-opps/${encodeURIComponent(noticeId)}`;
  const { status, body, contentType } = await forwardJson(url, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});

samOppsRoutes.post("/search", async (c) => {
  const url = `${env.BACKEND_X_API_URL}/api/v1/sam-opps/search`;
  const reqBody = await c.req.text();
  const { status, body, contentType } = await forwardJson(url, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: reqBody,
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});

samOppsRoutes.post("/stats", async (c) => {
  const url = `${env.BACKEND_X_API_URL}/api/v1/sam-opps/stats`;
  const reqBody = await c.req.text();
  const { status, body, contentType } = await forwardJson(url, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: reqBody,
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});
