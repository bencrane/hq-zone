/**
 * GTM signals broker — forwards authenticated read requests to hq-x's
 * /api/v1/signals passthrough, which proxies on to data-engine-x.
 *
 * Mirrors the coverage / sam-opps / gtm-people pattern: platform-app sends
 * the user's Supabase access_token; `requireUser` validates it on this side.
 * We call hq-x with the BFF service token as the Authorization header
 * and forward the user JWT as `X-User-Bearer`.
 *
 * Routes:
 *   GET    /         → hq-x GET    /api/v1/signals
 *   PATCH  /:slug    → hq-x PATCH  /api/v1/signals/:slug   (webhook URLs / target / is_active)
 *   DELETE /:slug    → hq-x DELETE /api/v1/signals/:slug   (hard delete)
 *
 * hq-x response status + body are passed through verbatim.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const gtmSignalsRoutes = new Hono<{ Variables: AuthVariables }>();

gtmSignalsRoutes.use("*", requireUser);

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

async function proxy(
  c: { req: { header: (k: string) => string | undefined } },
  url: string,
  init: { method: string; body?: string },
): Promise<Response> {
  const headers: Record<string, string> = backendHeaders(c);
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { method: init.method, headers, body: init.body });
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";
  return new Response(text, {
    status: res.status,
    headers: { "content-type": contentType },
  });
}

gtmSignalsRoutes.get("/", (c) =>
  proxy(c, `${env.BACKEND_X_API_URL}/api/v1/signals`, { method: "GET" }),
);

gtmSignalsRoutes.patch("/:slug", async (c) => {
  const slug = encodeURIComponent(c.req.param("slug"));
  const body = await c.req.text(); // forward verbatim; hq-x validates shape
  return proxy(c, `${env.BACKEND_X_API_URL}/api/v1/signals/${slug}`, {
    method: "PATCH",
    body,
  });
});

gtmSignalsRoutes.delete("/:slug", (c) => {
  const slug = encodeURIComponent(c.req.param("slug"));
  return proxy(c, `${env.BACKEND_X_API_URL}/api/v1/signals/${slug}`, {
    method: "DELETE",
  });
});
