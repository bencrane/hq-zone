/**
 * The declarative allowlist of platform-api → hq-x routes. This is the entire
 * config surface that used to be six hand-written files: each entry is a BFF
 * path, the hq-x URL it forwards to, a response mode (json | stream), and how
 * the operator identity is injected (header | body | none). Adding an hq-x
 * surface is ONE row here — no new file, no copy-pasted auth/forwarding.
 *
 * Static-segment paths are ordered before their `:param` siblings so the
 * router registers the specific route first (e.g. /views/catalog/sources
 * before /views/:id).
 */
import type { Context } from "hono";

import { env } from "../env.ts";
import type { IdentityMode } from "./identity.ts";

export interface HqxRoute {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** BFF path in Hono syntax. The router mounts the table at "/", so these are
   *  full paths. */
  path: string;
  /** Build the upstream hq-x URL from the request context. */
  url: (c: Context) => string;
  mode: "json" | "stream";
  identity: IdentityMode;
}

const B = env.HQX_API_URL;

/** Encode a path param the route guarantees is present (it's a literal segment
 *  in `path`, so it always resolves at request time). */
function p(c: Context, key: string): string {
  return encodeURIComponent(c.req.param(key) ?? "");
}

/** Append the inbound query string to an upstream base, when present. */
function withQuery(c: Context, base: string): string {
  const qs = c.req.url.split("?")[1];
  return qs ? `${base}?${qs}` : base;
}

export const HQX_ROUTES: HqxRoute[] = [
  // ── agent-runs: the gtm-agent chat backend (Anthropic Managed Agents) ─────
  // POST mints a session (body injection adds the required user_id); the
  // session-scoped routes treat session_id as the capability handle.
  {
    method: "POST",
    path: "/api/v1/agent-runs",
    mode: "json",
    identity: "body",
    url: () => `${B}/api/v1/agent-runs`,
  },
  {
    // List the caller's runs (sidebar history). user_id is injected from the
    // validated JWT by the forwarder (identity: "query").
    method: "GET",
    path: "/api/v1/agent-runs",
    mode: "json",
    identity: "query",
    url: (c) => withQuery(c, `${B}/api/v1/agent-runs`),
  },
  {
    method: "GET",
    path: "/api/v1/agent-runs/:id/stream",
    mode: "stream",
    identity: "none",
    url: (c) => `${B}/api/v1/agent-runs/${p(c, "id")}/stream`,
  },
  {
    method: "GET",
    path: "/api/v1/agent-runs/:id/events",
    mode: "json",
    identity: "none",
    url: (c) => withQuery(c, `${B}/api/v1/agent-runs/${p(c, "id")}/events`),
  },
  {
    method: "POST",
    path: "/api/v1/agent-runs/:id/events",
    mode: "json",
    identity: "none",
    url: (c) => `${B}/api/v1/agent-runs/${p(c, "id")}/events`,
  },
  {
    method: "GET",
    path: "/api/v1/agent-runs/:id",
    mode: "json",
    identity: "none",
    url: (c) => `${B}/api/v1/agent-runs/${p(c, "id")}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/agent-runs/:id",
    mode: "json",
    identity: "none",
    url: (c) => `${B}/api/v1/agent-runs/${p(c, "id")}`,
  },
  {
    method: "DELETE",
    path: "/api/v1/agent-runs/:id",
    mode: "json",
    identity: "none",
    url: (c) => `${B}/api/v1/agent-runs/${p(c, "id")}`,
  },

  // ── signals: read / manage + the run-agent coupling ──────────────────────
  {
    method: "GET",
    path: "/api/v1/signals",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/signals`,
  },
  {
    method: "POST",
    path: "/api/v1/signals/:slug/run-agent",
    mode: "json",
    identity: "body",
    url: (c) => `${B}/api/v1/signals/${p(c, "slug")}/run-agent`,
  },
  {
    method: "POST",
    path: "/api/v1/signals/:slug/fire",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/signals/${p(c, "slug")}/fire`,
  },
  {
    method: "GET",
    path: "/api/v1/signals/fire/status/:call_id",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/signals/fire/status/${p(c, "call_id")}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/signals/:slug",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/signals/${p(c, "slug")}`,
  },
  {
    method: "DELETE",
    path: "/api/v1/signals/:slug",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/signals/${p(c, "slug")}`,
  },

  // ── sam-opps ─────────────────────────────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/sam-opps/search",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/sam-opps/search`,
  },
  {
    method: "POST",
    path: "/api/v1/sam-opps/stats",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/sam-opps/stats`,
  },
  {
    method: "GET",
    path: "/api/v1/sam-opps/:notice_id",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/sam-opps/${p(c, "notice_id")}`,
  },

  // ── coverage ─────────────────────────────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/coverage/stats",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/coverage/stats`,
  },

  // ── gtm/people (forwards the query string) ───────────────────────────────
  {
    method: "GET",
    path: "/api/v1/gtm/people",
    mode: "json",
    identity: "header",
    url: (c) => withQuery(c, `${B}/api/v1/gtm/people`),
  },

  // ── views: BFF /api/v1/views/* → hq-x /api/v1/gtm/views/* ─────────────────
  {
    method: "GET",
    path: "/api/v1/views/catalog/sources",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/gtm/views/catalog/sources`,
  },
  {
    method: "POST",
    path: "/api/v1/views/catalog/refresh",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/gtm/views/catalog/refresh`,
  },
  {
    method: "GET",
    path: "/api/v1/views",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/gtm/views`,
  },
  {
    method: "POST",
    path: "/api/v1/views",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/gtm/views`,
  },
  {
    method: "POST",
    path: "/api/v1/views/:id/compute",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/gtm/views/${p(c, "id")}/compute`,
  },
  {
    method: "POST",
    path: "/api/v1/views/:id/materialize",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/gtm/views/${p(c, "id")}/materialize`,
  },
  {
    method: "GET",
    path: "/api/v1/views/:id",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/gtm/views/${p(c, "id")}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/views/:id",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/gtm/views/${p(c, "id")}`,
  },
  {
    method: "DELETE",
    path: "/api/v1/views/:id",
    mode: "json",
    identity: "header",
    url: (c) => `${B}/api/v1/gtm/views/${p(c, "id")}`,
  },

  // ── scheduled-tasks: the Trigger.dev cron control plane (operator) ─────────
  // GET lists the registry + computed status; PATCH toggles enable/disable +
  // retags. PATCH uses body-injection so hq-x records the operator (disabled_by).
  {
    method: "GET",
    path: "/api/v1/admin/scheduled-tasks",
    mode: "json",
    identity: "header",
    url: () => `${B}/api/v1/admin/scheduled-tasks`,
  },
  {
    method: "PATCH",
    path: "/api/v1/admin/scheduled-tasks/:task_id",
    mode: "json",
    identity: "body",
    url: (c) => `${B}/api/v1/admin/scheduled-tasks/${p(c, "task_id")}`,
  },
];
