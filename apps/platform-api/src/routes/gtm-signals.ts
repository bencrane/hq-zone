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
 *   GET    /              → hq-x GET    /api/v1/signals
 *   PATCH  /:slug         → hq-x PATCH  /api/v1/signals/:slug         (webhook URLs / target / is_active)
 *   DELETE /:slug         → hq-x DELETE /api/v1/signals/:slug         (hard delete)
 *   POST   /:slug/fire    → hq-x POST   /api/v1/signals/:slug/fire    (manual one-shot via Modal)
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

gtmSignalsRoutes.post("/:slug/fire", async (c) => {
  const slug = encodeURIComponent(c.req.param("slug"));
  // Body is optional ({target?, limit?}); forward as-is, hq-x validates shape.
  // c.req.text() returns "" when no body was sent, which hq-x's
  // SignalFireBody | None handles cleanly. Returns {call_id, status:"pending", slug}
  // immediately — the UI polls /fire/status/:call_id for the result.
  const body = await c.req.text();
  return proxy(c, `${env.BACKEND_X_API_URL}/api/v1/signals/${slug}/fire`, {
    method: "POST",
    body,
  });
});

gtmSignalsRoutes.get("/fire/status/:call_id", (c) => {
  // Non-blocking poll of a previously-spawned fire. Returns either
  //   {status:"pending", call_id}
  // or
  //   {status:"done", call_id, result:{...}}
  // hq-x propagates DEX's 422 (per-signal error) and 410 (call_id expired)
  // verbatim so the UI can render the precise reason.
  const callId = encodeURIComponent(c.req.param("call_id"));
  return proxy(c, `${env.BACKEND_X_API_URL}/api/v1/signals/fire/status/${callId}`, {
    method: "GET",
  });
});
