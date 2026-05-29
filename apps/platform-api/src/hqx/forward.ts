/**
 * The single forwarder behind every platform-api → hq-x route. Two modes:
 *
 *   - forwardJson:   buffer the upstream body and re-emit with VERBATIM status
 *                    + content-type (hq-x's structured error envelopes pass
 *                    through unchanged). Correct for every REST route.
 *   - forwardStream: hand hq-x's `text/event-stream` ReadableStream straight to
 *                    the Response WITHOUT buffering. This is the SSE fix: the
 *                    old per-file `proxy()` did `await res.text()`, which holds
 *                    the whole stream until upstream closes — i.e. never flushes
 *                    a live agent frame. Here the body pipes through chunk by
 *                    chunk and @hono/node-server pumps it to the socket with
 *                    backpressure.
 *
 * Client disconnect: forwardStream forwards `c.req.raw.signal` to the upstream
 * fetch, so closing the browser tab aborts BFF → hq-x → Anthropic.
 */
import type { Context } from "hono";

import type { AuthVariables } from "../auth.ts";
import { type IdentityMode, hqxHeaders, injectUserId } from "./identity.ts";

type Ctx = Context<{ Variables: AuthVariables }>;

export interface ForwardSpec {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  identity: IdentityMode;
}

/**
 * Build the outbound body. GET/DELETE carry none. For writes: `body` identity
 * injects user_id; otherwise the client body is forwarded as-is, defaulting an
 * empty body to `{}` so hq-x endpoints that expect a JSON object (views
 * compute / materialize / catalog-refresh) still receive one — matching the
 * prior hand-written behavior.
 */
async function outboundBody(c: Ctx, spec: ForwardSpec): Promise<string | undefined> {
  if (spec.method === "GET" || spec.method === "DELETE") return undefined;
  const raw = await c.req.text();
  if (spec.identity === "body") return injectUserId(raw, c.get("user"));
  return raw && raw.trim().length > 0 ? raw : "{}";
}

/** Inject the validated operator id as a query param (caller-scoped GETs). */
function withUserId(url: string, userId: string): string {
  const u = new URL(url);
  u.searchParams.set("user_id", userId);
  return u.toString();
}

export async function forwardJson(c: Ctx, spec: ForwardSpec): Promise<Response> {
  const body = await outboundBody(c, spec);
  const url = spec.identity === "query" ? withUserId(spec.url, c.get("user").user_id) : spec.url;
  const upstream = await fetch(url, {
    method: spec.method,
    headers: hqxHeaders(c.get("user"), spec.identity, body !== undefined),
    body,
  });
  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";
  return new Response(text, { status: upstream.status, headers: { "content-type": contentType } });
}

export async function forwardStream(c: Ctx, spec: ForwardSpec): Promise<Response> {
  const upstream = await fetch(spec.url, {
    method: "GET",
    headers: { ...hqxHeaders(c.get("user"), spec.identity, false), Accept: "text/event-stream" },
    // Propagate client disconnect upstream so hq-x (and Anthropic) tear down.
    signal: c.req.raw.signal,
  });

  // Upstream refused before the stream opened (401/404/5xx) — surface its
  // status + body verbatim instead of an empty event-stream.
  if (!upstream.ok || !upstream.body) {
    const errText = upstream.body ? await upstream.text() : "";
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new Response(errText, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  }

  // THE FIX: pass the ReadableStream straight through. No await on the body.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      // Re-assert hq-x's anti-buffering hint at the BFF edge (harmless on
      // Railway, correct if a buffering hop is ever inserted).
      "x-accel-buffering": "no",
    },
  });
}
