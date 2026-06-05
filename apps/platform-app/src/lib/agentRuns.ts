/**
 * Client for /api/v1/agent-runs (platform-api → core-x).
 *
 * Provides typed REST methods and an async-generator SSE consumer for
 * the Anthropic Managed Agents event stream. Auth uses the same
 * Supabase bearer pattern as the rest of lib/api.ts.
 *
 * Auto-ack of `present_result` custom tool calls happens upstream in
 * core-x's stream_events_with_autoack. The frontend does NOT send
 * user.custom_tool_result for present_result event_ids — it only
 * renders the typed result card. Other tool/permission gates (generic
 * agent.tool_use with permission_policy) still surface as requires_action
 * and the operator handles them via sendUserEvent({tool_confirmation}).
 */
import { supabase } from "./supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

// ───────────────────────────────────────────────────────────────────────────
// REST request/response types
// ───────────────────────────────────────────────────────────────────────────

export interface CreateAgentRunResponse {
  session_id: string;
  agent_id: string;
  environment_id: string;
  signal_slug: string | null;
  user_id: string;
  status: string;
  stop_reason: Record<string, unknown> | null;
  usage: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  anthropic: Record<string, unknown> | null;
}

export interface RunAgentForSignalArgs {
  signal_slug: string;
  limit?: number;
  target?: "test" | "prod";
}

// ───────────────────────────────────────────────────────────────────────────
// Anthropic event taxonomy — closed union of what we actually render
// ───────────────────────────────────────────────────────────────────────────

export type SessionStopReason =
  | { type: "end_turn" }
  | { type: "interrupt" }
  | { type: "requires_action"; event_ids: string[] }
  | { type: string };

export interface TextBlock {
  type: "text";
  text: string;
}
export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}
export type ContentBlock = TextBlock | ThinkingBlock | { type: string; [k: string]: unknown };

interface BaseEvent {
  id?: string;
  processed_at?: string | null;
}

export interface AgentMessageEvent extends BaseEvent {
  type: "agent.message";
  content: ContentBlock[];
  stop_reason?: string | null;
  usage?: Record<string, unknown>;
}
export interface AgentThinkingEvent extends BaseEvent {
  type: "agent.thinking";
  content?: ContentBlock[];
  thinking?: string;
}
export interface AgentToolUseEvent extends BaseEvent {
  type: "agent.tool_use";
  name: string;
  input: unknown;
  tool_use_id?: string;
}
export interface AgentToolResultEvent extends BaseEvent {
  type: "agent.tool_result";
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}
export interface AgentMcpToolUseEvent extends BaseEvent {
  type: "agent.mcp_tool_use";
  name: string;
  server_name?: string;
  input: unknown;
}
export interface AgentMcpToolResultEvent extends BaseEvent {
  type: "agent.mcp_tool_result";
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}
export interface AgentCustomToolUseEvent extends BaseEvent {
  type: "agent.custom_tool_use";
  name: string;
  input: PresentResultInput | Record<string, unknown>;
}
export interface SessionStatusEvent extends BaseEvent {
  type:
    | "session.status_running"
    | "session.status_idle"
    | "session.status_rescheduled"
    | "session.status_terminated";
  stop_reason?: SessionStopReason | null;
}
export interface SessionErrorEvent extends BaseEvent {
  type: "session.error";
  error: { message?: string; type?: string; [k: string]: unknown };
}
export interface UserMessageEvent extends BaseEvent {
  type: "user.message";
  content: ContentBlock[];
}
export interface UserCustomToolResultEvent extends BaseEvent {
  type: "user.custom_tool_result";
  custom_tool_use_id: string;
  content: ContentBlock[];
}
export interface UnknownEvent extends BaseEvent {
  type: string;
  [k: string]: unknown;
}

export type AgentRunEvent =
  | AgentMessageEvent
  | AgentThinkingEvent
  | AgentToolUseEvent
  | AgentToolResultEvent
  | AgentMcpToolUseEvent
  | AgentMcpToolResultEvent
  | AgentCustomToolUseEvent
  | SessionStatusEvent
  | SessionErrorEvent
  | UserMessageEvent
  | UserCustomToolResultEvent
  | UnknownEvent;

// ───────────────────────────────────────────────────────────────────────────
// `present_result` payload schemas — must match
// apps/core-x/scripts/managed_agents/result_types.py exactly
// ───────────────────────────────────────────────────────────────────────────

export type ResultType =
  | "data_table"
  | "ranked_list"
  | "metric_grid"
  | "recommendation_card"
  | "narrative_summary"
  | "schema_card";

export const RESULT_TYPES: readonly ResultType[] = [
  "data_table",
  "ranked_list",
  "metric_grid",
  "recommendation_card",
  "narrative_summary",
  "schema_card",
] as const;

export type DataTableColumnType = "text" | "number" | "date" | "boolean" | "currency";

export interface DataTablePayload {
  columns: { key: string; label: string; type: DataTableColumnType }[];
  rows: Record<string, unknown>[];
  total_rows?: number;
  source?: string;
}

export interface RankedListPayload {
  scoring_method: string;
  items: {
    rank: number;
    id: string;
    label: string;
    score: number;
    score_max?: number;
    rationale: string;
    evidence?: Record<string, unknown>;
  }[];
}

export type MetricFormat = "int" | "decimal" | "percent" | "currency";

export interface MetricGridPayload {
  tiles: {
    label: string;
    value: number | string;
    format: MetricFormat;
    delta?: number;
    delta_label?: string;
  }[];
}

export interface RecommendationCardPayload {
  decision: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
  inputs_used: string[];
  next_actions?: string[];
}

export interface NarrativeSummaryPayload {
  summary: string;
  key_points: string[];
  confidence?: "low" | "medium" | "high";
}

export interface SchemaCardPayload {
  dataset: string;
  namespace?: string;
  uri?: string;
  row_count?: number;
  columns: { name: string; type: string; nullable?: boolean }[];
}

export type ResultPayloadByType = {
  data_table: DataTablePayload;
  ranked_list: RankedListPayload;
  metric_grid: MetricGridPayload;
  recommendation_card: RecommendationCardPayload;
  narrative_summary: NarrativeSummaryPayload;
  schema_card: SchemaCardPayload;
};

export interface PresentResultInput {
  result_type: ResultType;
  title?: string;
  payload: Record<string, unknown>;
}

export const PRESENT_RESULT_TOOL_NAME = "present_result";

// Narrow a generic `Record<string, unknown>` payload to its typed shape.
// Returns null when result_type isn't known. Callers (renderers) should
// still treat the payload as `unknown` for safety — the type narrowing is
// a render-time convenience, not a runtime validator.
export function asResultPayload<T extends ResultType>(
  rt: T,
  payload: Record<string, unknown>,
): ResultPayloadByType[T] | null {
  if (!RESULT_TYPES.includes(rt)) return null;
  return payload as unknown as ResultPayloadByType[T];
}

// ───────────────────────────────────────────────────────────────────────────
// REST methods
// ───────────────────────────────────────────────────────────────────────────

export async function createAgentRunFromSignal(
  args: RunAgentForSignalArgs,
): Promise<CreateAgentRunResponse> {
  const { signal_slug, ...body } = args;
  const url = `${API_BASE}/api/v1/signals/${encodeURIComponent(signal_slug)}/run-agent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: await bearer(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`createAgentRunFromSignal failed: HTTP ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CreateAgentRunResponse;
}

export interface CreateAgentRunArgs {
  /** First user.message — core-x mints the session and seeds it with this. */
  initial_message: string;
  /** Optional human label for the run (admin "recent runs" view). */
  title?: string;
  /** Optional signal attribution; null/omitted for a free-form chat. */
  signal_slug?: string | null;
}

/**
 * Mint a free-form chat session against the gtm-agent. Hits the BFF, which
 * injects the operator's `user_id` from the validated JWT (the browser never
 * sends it) and forwards to core-x `POST /api/v1/agent-runs`.
 */
export async function createAgentRun(args: CreateAgentRunArgs): Promise<CreateAgentRunResponse> {
  const res = await fetch(`${API_BASE}/api/v1/agent-runs`, {
    method: "POST",
    headers: {
      Authorization: await bearer(),
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`createAgentRun failed: HTTP ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CreateAgentRunResponse;
}

// ───────────────────────────────────────────────────────────────────────────
// Session history — server-backed, per-operator (backs the chat sidebar).
// The BFF injects user_id from the validated JWT; the browser sends none.
// ───────────────────────────────────────────────────────────────────────────

export interface AgentRunSummary {
  /** Anthropic session_id (sesn_*). */
  id: string;
  title: string;
  status: string;
  signal_slug: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentRunListRow {
  session_id: string;
  title: string | null;
  status: string;
  signal_slug: string | null;
  created_at: string;
  updated_at: string;
}

/** The caller's runs, newest first. */
export async function listAgentRuns(limit = 100): Promise<AgentRunSummary[]> {
  const url = new URL(`${API_BASE}/api/v1/agent-runs`, window.location.origin);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { headers: { Authorization: await bearer() } });
  if (!res.ok) {
    throw new Error(`listAgentRuns failed: HTTP ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data?: AgentRunListRow[] };
  return (body.data ?? []).map((r) => ({
    id: r.session_id,
    title: r.title ?? "Untitled chat",
    status: r.status,
    signal_slug: r.signal_slug,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function renameAgentRun(sessionId: string, title: string): Promise<void> {
  const url = `${API_BASE}/api/v1/agent-runs/${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: await bearer(), "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`renameAgentRun failed: HTTP ${res.status} ${await res.text()}`);
  }
}

export async function deleteAgentRun(sessionId: string): Promise<void> {
  const url = `${API_BASE}/api/v1/agent-runs/${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: await bearer() } });
  if (!res.ok) {
    throw new Error(`deleteAgentRun failed: HTTP ${res.status} ${await res.text()}`);
  }
}

export async function listAgentRunEvents(
  sessionId: string,
  opts: { after?: string; limit?: number } = {},
): Promise<{ data: AgentRunEvent[] }> {
  const url = new URL(
    `${API_BASE}/api/v1/agent-runs/${encodeURIComponent(sessionId)}/events`,
    window.location.origin,
  );
  if (opts.after) url.searchParams.set("after", opts.after);
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));
  const res = await fetch(url.toString(), {
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) {
    throw new Error(`listAgentRunEvents failed: HTTP ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data?: AgentRunEvent[]; events?: AgentRunEvent[] };
  return { data: body.data ?? body.events ?? [] };
}

export type UserDomainEvent =
  | { type: "user.message"; content: ContentBlock[] }
  | { type: "user.interrupt" }
  | {
      type: "user.tool_confirmation";
      tool_use_id: string;
      result: "allow" | "deny";
      deny_message?: string;
    }
  | { type: "user.custom_tool_result"; custom_tool_use_id: string; content: ContentBlock[] };

/**
 * Error raised by sendUserEvent. Carries the upstream Anthropic status/body
 * that platform-api → core-x forward in the 502 detail, so callers can tell a
 * *recoverable* "session busy / waiting on a tool ack" 400 (which clears on
 * stream reconnect or a user.interrupt) apart from a terminal one (the
 * Anthropic session is terminated/expired). Without this distinction the chat
 * either shows a raw 502 or silently drops the operator's message.
 */
export class SendUserEventError extends Error {
  /** HTTP status of the BFF response (typically 502 when Anthropic rejects). */
  readonly httpStatus: number;
  /** Anthropic's own status, forwarded by core-x (e.g. 400). Null if absent. */
  readonly upstreamStatus: number | null;
  /** Truncated upstream Anthropic error body, forwarded by core-x. */
  readonly upstreamBody: string | null;

  constructor(args: {
    message: string;
    httpStatus: number;
    upstreamStatus: number | null;
    upstreamBody: string | null;
  }) {
    super(args.message);
    this.name = "SendUserEventError";
    this.httpStatus = args.httpStatus;
    this.upstreamStatus = args.upstreamStatus;
    this.upstreamBody = args.upstreamBody;
  }

  /**
   * True when the failure is a transient "session is mid-turn or waiting on a
   * tool-result ack" rejection — recoverable by reconnecting the stream (which
   * triggers core-x's present_result reconcile) or by sending user.interrupt.
   * Anthropic returns 400 with a body that whitelists user.tool_confirmation /
   * user.custom_tool_result / user.tool_result / user.interrupt as the only
   * events it will accept until the open tool call resolves.
   */
  get isRecoverableBusy(): boolean {
    if (this.upstreamStatus !== 400) return false;
    const body = (this.upstreamBody ?? this.message).toLowerCase();
    return (
      body.includes("waiting on responses to events") ||
      body.includes("user.tool_confirmation") ||
      body.includes("user.custom_tool_result")
    );
  }

  /**
   * True when the session can no longer accept ANY event (terminated/expired).
   * The only recovery is a fresh chat — even user.interrupt will be rejected.
   */
  get isTerminal(): boolean {
    const body = (this.upstreamBody ?? this.message).toLowerCase();
    return (
      body.includes("terminated") ||
      body.includes("expired") ||
      body.includes("not found") ||
      this.httpStatus === 404
    );
  }
}

/** Parse the BFF 502 detail (or any error body) for the forwarded upstream fields. */
function parseUpstreamDetail(raw: string): {
  message: string;
  upstreamStatus: number | null;
  upstreamBody: string | null;
} {
  try {
    const parsed = JSON.parse(raw) as {
      detail?: { message?: string; upstream_status?: number; upstream_body?: string };
    };
    const d = parsed.detail;
    if (d) {
      return {
        message: d.message ?? raw,
        upstreamStatus: typeof d.upstream_status === "number" ? d.upstream_status : null,
        upstreamBody: d.upstream_body ?? null,
      };
    }
  } catch {
    // not JSON — fall through to raw
  }
  return { message: raw, upstreamStatus: null, upstreamBody: null };
}

export async function sendUserEvent(sessionId: string, event: UserDomainEvent): Promise<void> {
  const url = `${API_BASE}/api/v1/agent-runs/${encodeURIComponent(sessionId)}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: await bearer(),
      "content-type": "application/json",
    },
    body: JSON.stringify({ events: [event] }),
  });
  if (!res.ok) {
    const raw = await res.text();
    const { message, upstreamStatus, upstreamBody } = parseUpstreamDetail(raw);
    throw new SendUserEventError({
      message: `sendUserEvent failed: HTTP ${res.status} ${message}`,
      httpStatus: res.status,
      upstreamStatus,
      upstreamBody,
    });
  }
}

export async function interruptAgentRun(sessionId: string): Promise<void> {
  return sendUserEvent(sessionId, { type: "user.interrupt" });
}

// ───────────────────────────────────────────────────────────────────────────
// SSE consumer — async generator over the agent's event stream
// ───────────────────────────────────────────────────────────────────────────

/**
 * Consume the agent run's SSE stream. Yields one parsed JSON event per
 * SSE frame. Heartbeat comment lines (`: …`) and malformed frames are
 * silently dropped.
 *
 * Usage:
 *
 *   const abort = new AbortController();
 *   try {
 *     for await (const ev of streamAgentRun(sid, abort.signal)) {
 *       handleEvent(ev);
 *     }
 *   } finally {
 *     abort.abort();
 *   }
 *
 * The AbortSignal is forwarded to the underlying fetch — disconnect
 * propagates all the way back to core-x and Anthropic.
 */
export async function* streamAgentRun(
  sessionId: string,
  signal: AbortSignal,
): AsyncGenerator<AgentRunEvent> {
  const url = `${API_BASE}/api/v1/agent-runs/${encodeURIComponent(sessionId)}/stream`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: await bearer(),
      Accept: "text/event-stream",
    },
    signal,
  });
  if (!res.ok || !res.body) {
    const body = res.body ? await res.text().catch(() => "") : "";
    throw new Error(`streamAgentRun failed: HTTP ${res.status} ${body.slice(0, 500)}`);
  }
  yield* parseSseStream(res.body);
}

/**
 * Parse a ``text/event-stream`` ReadableStream into a sequence of parsed
 * JSON events. Spec-compliant frame splitter:
 *
 *   - Frames are separated by an empty line (``\n\n``).
 *   - Within a frame, multiple ``data:`` lines are concatenated with
 *     a literal ``\n`` (per the SSE spec; Anthropic emits single-line
 *     ``data:`` per frame, but the spec-compliant form is robust to that).
 *   - Lines starting with ``:`` are comments — the heartbeat
 *     ``: heartbeat`` from platform-api is dropped here.
 *   - Lines without a recognized field name are ignored.
 *   - ``event:`` / ``id:`` / ``retry:`` fields are read but not surfaced
 *     to the caller (Anthropic-frame consumers care about the JSON ``id``
 *     INSIDE the data, not the SSE-level event ID).
 *
 * On JSON parse failure the frame is silently dropped — callers should
 * not rely on a 1:1 mapping between upstream bytes and yielded events.
 */
async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentRunEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          const final = parseSseFrame(buffer);
          if (final !== null) yield final;
        }
        return;
      }
      buffer += decoder.decode(value, { stream: true });

      // Drain complete frames. Frame boundary = blank line (\n\n).
      // Also tolerate \r\n\r\n for robustness across proxies.
      while (true) {
        const nlnl = buffer.indexOf("\n\n");
        const crlfcrlf = buffer.indexOf("\r\n\r\n");
        const boundary = nlnl === -1 ? crlfcrlf : crlfcrlf === -1 ? nlnl : Math.min(nlnl, crlfcrlf);
        if (boundary < 0) break;
        const boundaryLen = boundary === crlfcrlf ? 4 : 2;
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + boundaryLen);
        const parsed = parseSseFrame(frame);
        if (parsed !== null) yield parsed;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // already cancelled
    }
  }
}

function parseSseFrame(frame: string): AgentRunEvent | null {
  const dataLines: string[] = [];
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line === "") continue;
    if (line.startsWith(":")) continue; // SSE comment (heartbeats)
    if (line.startsWith("data:")) {
      // SSE spec: optional single space after the colon.
      const v = line.slice(5);
      dataLines.push(v.startsWith(" ") ? v.slice(1) : v);
    }
    // event: / id: / retry: ignored for now
  }
  if (dataLines.length === 0) return null;
  const data = dataLines.join("\n");
  if (data === "") return null;
  try {
    const parsed = JSON.parse(data);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof parsed.type === "string"
    ) {
      return parsed as AgentRunEvent;
    }
    return null;
  } catch {
    return null;
  }
}
