/**
 * coverage broker — forwards authenticated read requests to
 * data-engine-x's /coverage/stats endpoint.
 *
 * Unlike sam-opps/gtm-people which route through backend-engine, the
 * Coverage card consumes DEX directly: the data is operator-grade
 * meta-coverage stats (datasets / bridges / intersections), so there's
 * no per-user scoping to do downstream. requireUser still gates the
 * call at the BFF — only signed-in operators can hit the route.
 *
 * Routes:
 *   GET /stats → DEX GET /coverage/stats
 *
 * DEX response status + body are passed through verbatim.
 */

import { Hono } from "hono";

import { env } from "../env.ts";
import { requireUser, type AuthVariables } from "../auth.ts";

export const coverageRoutes = new Hono<{ Variables: AuthVariables }>();

coverageRoutes.use("*", requireUser);

coverageRoutes.get("/stats", async (c) => {
  const res = await fetch(`${env.DEX_API_URL}/coverage/stats`, {
    headers: { Authorization: `Bearer ${env.DEX_SERVICE_TOKEN}` },
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
});
