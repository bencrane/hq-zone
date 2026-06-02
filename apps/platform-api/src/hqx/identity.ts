/**
 * The single auth-swap + identity-injection seam for every platform-api → hq-x
 * call. Replaces the `backendHeaders` / `userBearerFromRequest` / per-route
 * body-injection logic that was copy-pasted across six route files.
 *
 * The BFF always presents the static service token as its OWN identity
 * (`Authorization: Bearer <HQX_SERVICE_TOKEN>`); hq-x verifies it with a
 * constant-time compare (see hq-x `app/auth/service_token.py`). The OPERATOR
 * identity is injected one of three ways, chosen per route:
 *
 *   - "header": forward the validated JWT as `X-User-Bearer`. hq-x routes that
 *               scope by user read it here. (The historical default for every
 *               proxied route — sam-opps, coverage, gtm-people, signals, views.)
 *   - "body":   merge `user_id` (the JWT `sub`) into the JSON request body. hq-x
 *               routes whose Pydantic body REQUIRES user_id under `extra=forbid`
 *               (agent-runs create, signal run-agent) read it here. The browser
 *               never sends user_id; the BFF is the only tier that validated the
 *               token, so it is the only tier trusted to set it.
 *   - "none":   session-scoped routes where the session_id is the capability
 *               handle and hq-x checks only the service token.
 */
import type { CurrentUser } from "../auth.ts";
import { env } from "../env.ts";

export type IdentityMode = "header" | "body" | "query" | "none";

/** Service-token swap (always) + optional `X-User-Bearer` (header mode). */
export function hqxHeaders(
  user: CurrentUser,
  identity: IdentityMode,
  sendsJsonBody: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.HQX_SERVICE_TOKEN}`,
  };
  if (sendsJsonBody) headers["Content-Type"] = "application/json";
  if (identity === "header") headers["X-User-Bearer"] = `Bearer ${user.jwt}`;
  return headers;
}

/**
 * Merge the trusted `user_id` into a JSON body. Tolerates an empty/absent body
 * (the browser sends only `{limit,target}` to run-agent, or `{initial_message}`
 * to agent-runs create) — we start from `{}` and set user_id either way. A
 * non-object body (array / scalar) is replaced by `{ user_id }`; hq-x's
 * `extra=forbid` models only accept an object anyway.
 */
export function injectUserId(rawBody: string | undefined, user: CurrentUser): string {
  let obj: Record<string, unknown> = {};
  if (rawBody && rawBody.trim().length > 0) {
    const parsed = JSON.parse(rawBody) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      obj = parsed as Record<string, unknown>;
    }
  }
  obj.user_id = user.user_id;
  return JSON.stringify(obj);
}
