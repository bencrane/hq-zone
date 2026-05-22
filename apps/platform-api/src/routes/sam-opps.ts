/**
 * sam-opps broker — forwards authenticated requests to data-engine-x.
 *
 * platform-app sends the user's Supabase access_token on every request;
 * `requireUser` validates it on this side. We then forward the SAME JWT
 * to DEX as Bearer — DEX trusts hq-x Supabase JWTs natively (see
 * `data-engine-x/app/auth/hqx_supabase.py`). No service-token layer
 * required for this surface; the user identity propagates end-to-end.
 *
 * Routes:
 *   GET  /:notice_id      → DEX GET  /sam-opps/v1/:notice_id
 *   POST /search          → DEX POST /sam-opps/v1/search
 *   POST /stats           → DEX POST /sam-opps/v1/stats
 *
 * DEX response status + body are passed through verbatim (including
 * error envelopes). The BFF synthesizes nothing — validation lives
 * downstream.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const samOppsRoutes = new Hono<{ Variables: AuthVariables }>();

samOppsRoutes.use("*", requireUser);

function bearerFromRequest(c: { req: { header: (k: string) => string | undefined } }): string {
  // requireUser already validated the header; re-extract for forwarding.
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader) {
    throw new HTTPException(401, { message: "Missing bearer token (post-auth)" });
  }
  return authHeader;
}

async function forwardJson(upstreamUrl: string, init: RequestInit) {
  const res = await fetch(upstreamUrl, init);
  const text = await res.text();
  // Pass DEX response through unchanged. Content-type best-effort.
  const contentType = res.headers.get("content-type") ?? "application/json";
  return { status: res.status, body: text, contentType };
}

samOppsRoutes.get("/:notice_id", async (c) => {
  const noticeId = c.req.param("notice_id");
  const url = `${env.DEX_BASE_URL}/sam-opps/v1/${encodeURIComponent(noticeId)}`;
  const { status, body, contentType } = await forwardJson(url, {
    method: "GET",
    headers: { Authorization: bearerFromRequest(c) },
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});

samOppsRoutes.post("/search", async (c) => {
  const url = `${env.DEX_BASE_URL}/sam-opps/v1/search`;
  const reqBody = await c.req.text();
  const { status, body, contentType } = await forwardJson(url, {
    method: "POST",
    headers: {
      Authorization: bearerFromRequest(c),
      "Content-Type": "application/json",
    },
    body: reqBody,
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});

samOppsRoutes.post("/stats", async (c) => {
  const url = `${env.DEX_BASE_URL}/sam-opps/v1/stats`;
  const reqBody = await c.req.text();
  const { status, body, contentType } = await forwardJson(url, {
    method: "POST",
    headers: {
      Authorization: bearerFromRequest(c),
      "Content-Type": "application/json",
    },
    body: reqBody,
  });
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
});
