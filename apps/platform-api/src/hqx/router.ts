/**
 * The core-x gateway: one Hono app that registers every HQX_ROUTES entry behind
 * `requireUser`, dispatching to the JSON or streaming forwarder by mode. This
 * is what `index.ts` mounts at "/" in place of the six per-domain `app.route`
 * calls. Adding an core-x surface is a row in table.ts, never a new file here.
 */
import { Hono } from "hono";

import { type AuthVariables, requireUser } from "../auth.ts";
import { forwardJson, forwardStream } from "./forward.ts";
import { HQX_ROUTES } from "./table.ts";

export function hqxRouter(): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();

  // requireUser is attached per-route (not as a "*" middleware) so genuinely
  // unknown paths fall through to 404 instead of being masked as 401 —
  // preserving the prior per-prefix behavior and surfacing path typos.
  for (const route of HQX_ROUTES) {
    app.on(route.method, route.path, requireUser, (c) => {
      const url = route.url(c);
      return route.mode === "stream"
        ? forwardStream(c, { method: "GET", url, identity: route.identity })
        : forwardJson(c, { method: route.method, url, identity: route.identity });
    });
  }

  return app;
}
