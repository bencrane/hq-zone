/**
 * Audiences BFF — passthrough to hq-x `/api/v1/gtm/audiences`, which
 * proxies on to data-engine-x where the `gtm.audiences` table + the
 * spec → DuckDB compiler live.
 *
 * Mirrors the coverage.ts pattern: platform-app sends the user's
 * Supabase access_token; `requireUser` validates it on this side. We
 * call hq-x with the BFF service token as the Authorization header and
 * forward the user JWT as `X-User-Bearer`.
 *
 * Routes:
 *   GET    /                  → hq-x GET    /api/v1/gtm/audiences
 *   POST   /                  → hq-x POST   /api/v1/gtm/audiences
 *   GET    /:id               → hq-x GET    /api/v1/gtm/audiences/:id
 *   PATCH  /:id               → hq-x PATCH  /api/v1/gtm/audiences/:id
 *   DELETE /:id               → hq-x DELETE /api/v1/gtm/audiences/:id
 *   POST   /:id/compute       → hq-x POST   /api/v1/gtm/audiences/:id/compute
 *   GET    /catalog/sources   → local AUDIENCE_SOURCE_CATALOG (no round-trip)
 *
 * hq-x response status + body are passed through verbatim for the
 * proxy routes. The catalog endpoint is served locally because the
 * AUDIENCE_SOURCE_CATALOG drives the UI form and is shared at compile
 * time via @rare-structure-hq/shared.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { AUDIENCE_SOURCE_CATALOG } from "@rare-structure-hq/shared";

import { env } from "../env.ts";
import { type AuthVariables, requireUser } from "../auth.ts";

export const audiencesRoutes = new Hono<{ Variables: AuthVariables }>();

audiencesRoutes.use("*", requireUser);

function userBearerFromRequest(c: { req: { header: (k: string) => string | undefined } }): string {
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader) {
    throw new HTTPException(401, { message: "Missing bearer token (post-auth)" });
  }
  return authHeader;
}

function backendHeaders(
  c: { req: { header: (k: string) => string | undefined } },
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    Authorization: `Bearer ${env.BACKEND_X_SERVICE_TOKEN}`,
    "X-User-Bearer": userBearerFromRequest(c),
    ...(extra ?? {}),
  };
}

async function proxyResponse(res: Response): Promise<Response> {
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  return new Response(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}

const HQX_AUDIENCES = "/api/v1/gtm/audiences";

// GET /catalog/sources — served locally; must come BEFORE /:id so the literal
// segment beats the wildcard.
audiencesRoutes.get("/catalog/sources", (c) => {
  return c.json({ sources: AUDIENCE_SOURCE_CATALOG });
});

audiencesRoutes.get("/", async (c) => {
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}`, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

audiencesRoutes.post("/", async (c) => {
  const body = await c.req.text();
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body,
  });
  return proxyResponse(res);
});

audiencesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}/${id}`, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

audiencesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.text();
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}/${id}`, {
    method: "PATCH",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body,
  });
  return proxyResponse(res);
});

audiencesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}/${id}`, {
    method: "DELETE",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

audiencesRoutes.post("/:id/compute", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_AUDIENCES}/${id}/compute`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: "{}",
  });
  return proxyResponse(res);
});
