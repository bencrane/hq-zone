/**
 * The declarative allowlist of platform-api → edge-api routes. Each entry is a
 * BFF path, the edge-api URL it forwards to, a response mode (json | stream),
 * and how the operator identity is injected (header | body | none).
 *
 * As of the core-x migration this table is agent-runs ONLY: hq-zone talks to
 * edge-api (the managed-agents edge), never hq-x. The former hq-x route-groups
 * (signals, sam-opps, coverage, gtm/people, views, scheduled-tasks) were stale
 * against the new core-x and have been retired — to be rebuilt on edge-api /
 * core-x later.
 */
import type { Context } from "hono";

import { env } from "../env.ts";
import type { IdentityMode } from "./identity.ts";

export interface HqxRoute {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /** BFF path in Hono syntax. The router mounts the table at "/", so these are
   *  full paths. */
  path: string;
  /** Build the upstream edge-api URL from the request context. */
  url: (c: Context) => string;
  mode: "json" | "stream";
  identity: IdentityMode;
}

const B = env.EDGE_API_URL;

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
];
