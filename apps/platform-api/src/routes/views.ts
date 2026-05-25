/**
 * Views BFF — passthrough to hq-x `/api/v1/gtm/views`, which proxies on
 * to data-engine-x. DEX owns the `gtm.views` table, the Polaris-driven
 * source catalog, and the compute + materialize pipelines.
 *
 * Mirrors the coverage.ts pattern: platform-app sends the user's Supabase
 * access_token; `requireUser` validates it. We call hq-x with the BFF
 * service token + forward the user JWT as `X-User-Bearer`.
 *
 * Routes:
 *   GET    /                       → hq-x GET    /api/v1/gtm/views
 *   POST   /                       → hq-x POST   /api/v1/gtm/views
 *   GET    /:id                    → hq-x GET    /api/v1/gtm/views/:id
 *   PATCH  /:id                    → hq-x PATCH  /api/v1/gtm/views/:id
 *   DELETE /:id                    → hq-x DELETE /api/v1/gtm/views/:id
 *   POST   /:id/compute            → hq-x POST   /api/v1/gtm/views/:id/compute
 *   POST   /:id/materialize        → hq-x POST   /api/v1/gtm/views/:id/materialize
 *   GET    /catalog/sources        → hq-x GET    /api/v1/gtm/views/catalog/sources
 *   POST   /catalog/refresh        → hq-x POST   /api/v1/gtm/views/catalog/refresh
 *
 * The catalog is NOT served locally anymore — it's Polaris-driven on the
 * DEX side and changes whenever a new Lance dataset gets registered (which
 * happens whenever a view is materialized, or a new ingest lands).
 *
 * hq-x response status + body are passed through verbatim.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { type AuthVariables, requireUser } from "../auth.ts";

export const viewsRoutes = new Hono<{ Variables: AuthVariables }>();

viewsRoutes.use("*", requireUser);

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

const HQX_VIEWS = "/api/v1/gtm/views";

// /catalog/* must come BEFORE /:id so literal segments beat the wildcard.
viewsRoutes.get("/catalog/sources", async (c) => {
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/catalog/sources`, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

viewsRoutes.post("/catalog/refresh", async (c) => {
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/catalog/refresh`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: "{}",
  });
  return proxyResponse(res);
});

viewsRoutes.get("/", async (c) => {
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}`, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

viewsRoutes.post("/", async (c) => {
  const body = await c.req.text();
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body,
  });
  return proxyResponse(res);
});

viewsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/${id}`, {
    method: "GET",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

viewsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.text();
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/${id}`, {
    method: "PATCH",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body,
  });
  return proxyResponse(res);
});

viewsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/${id}`, {
    method: "DELETE",
    headers: backendHeaders(c),
  });
  return proxyResponse(res);
});

viewsRoutes.post("/:id/compute", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/${id}/compute`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: "{}",
  });
  return proxyResponse(res);
});

viewsRoutes.post("/:id/materialize", async (c) => {
  const id = c.req.param("id");
  const res = await fetch(`${env.BACKEND_X_API_URL}${HQX_VIEWS}/${id}/materialize`, {
    method: "POST",
    headers: backendHeaders(c, { "Content-Type": "application/json" }),
    body: "{}",
  });
  return proxyResponse(res);
});
