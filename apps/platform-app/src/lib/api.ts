/**
 * Thin BFF client for /api/v1/sam-opps/*. Pulls the current Supabase
 * access_token off the session at call-time so refreshes are picked up
 * automatically.
 */
import { supabase } from "./supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn("platform-app: VITE_API_BASE_URL missing — using same-origin.");
}

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

// ────────────── Types — mirror DEX shapes minimally ──────────────

export interface OppRow {
  notice_id: string;
  title: string | null;
  notice_type: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  department_agency: string | null;
  sub_tier: string | null;
  office: string | null;
  naics_code: string | null;
  set_aside_code: string | null;
  pop_state: string | null;
  pop_city: string | null;
  pop_country: string | null;
  active_flag: string | null;
  link: string | null;
  // detail-only fields are sparse on list rows; the detail call returns them.
  [k: string]: unknown;
}

export interface SearchResult {
  total_matched: number;
  rows: OppRow[];
}

export interface SearchFilters {
  naics_code?: string;
  naics_prefix?: string;
  set_aside_code?: string;
  pop_state?: string;
  posted_date_gte?: string;
  posted_date_lte?: string;
  response_deadline_gte?: string;
  response_deadline_lte?: string;
  department_agency?: string;
  notice_type?: string;
  active_flag?: string;
  limit?: number;
  offset?: number;
}

export interface StatsRow {
  value: string | null;
  count: number;
}

// ────────────── Calls ──────────────

export async function searchOpps(filters: SearchFilters): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/api/v1/sam-opps/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error(`search failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  // DEX wraps in { data: ... }
  return json.data as SearchResult;
}

export async function getOppDetail(noticeId: string): Promise<OppRow> {
  const res = await fetch(`${API_BASE}/api/v1/sam-opps/${encodeURIComponent(noticeId)}`, {
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) throw new Error(`detail failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data as OppRow;
}

export async function statsOpps(
  dimension: "naics_code" | "department_agency" | "notice_type" | "set_aside_code" | "pop_state",
  filters: SearchFilters = {},
): Promise<StatsRow[]> {
  const res = await fetch(`${API_BASE}/api/v1/sam-opps/stats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify({ ...filters, dimension }),
  });
  if (!res.ok) throw new Error(`stats failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data as StatsRow[];
}

// ────────────── Coverage card — meta-stats over R2 / RW / DEX ──────────────
//
// Backed by DEX GET /coverage/stats (which reads ops.coverage_stats — a
// nightly-emitted Postgres table). Three scope buckets share a common
// envelope shape, but the per-row `payload` differs by scope.

export interface CoverageStatRow {
  metric_name: string;
  captured_at: string | null;
  payload: CoverageStatPayload;
}

export interface CoverageStatPayload {
  // Dataset rows (Pattern A — Lance source datasets)
  row_count?: number;
  last_version_ts?: string;
  distinct_key_column?: string;
  // Bridge rows (Pattern B — domain / UEI / etc. bridges)
  match_method?: string;
  distinct_keys_matched?: number;
  tier_breakdown?: Record<string, number>;
  // Intersection rows (YAML intersections — predicate chains over bridges)
  predicate_chain?: string;
  lance_datasets?: string[];
  bridge?: string;
  cohort_filter?: unknown;
  count?: number;
  match_rate?: number | null;
  // Common across all scopes — surfaced when the emit run failed for a row.
  error?: string;
  // Lenient: emit script may add adjacent fields we want to render later.
  [k: string]: unknown;
}

export interface CoverageStats {
  datasets: CoverageStatRow[];
  bridges: CoverageStatRow[];
  intersections: CoverageStatRow[];
}

export async function getCoverageStats(): Promise<CoverageStats> {
  const res = await fetch(`${API_BASE}/api/v1/coverage/stats`, {
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) throw new Error(`coverage stats failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as CoverageStats;
}

// ────────────── GTM Signals — configuration-driven trigger registry ──────────────
// Backed by core-x /api/v1/signals → DEX /api/v1/gtm/signals (reads ops.gtm_signals).
// JSONB criteria is opaque-by-design at the API layer; the UI knows about a few
// well-known keys (time_window_hours, min_obligated_usd, award_types, action_types)
// and renders unknown keys as raw JSON.

export type WebhookTarget = "test" | "prod";

export interface GtmSignal {
  signal_slug: string;
  spine_target: string;
  criteria: Record<string, unknown>;
  webhook_test_url: string;
  webhook_prod_url: string;
  webhook_target: WebhookTarget;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface GtmSignalsResponse {
  signals: GtmSignal[];
}

export interface GtmSignalEnvelope {
  signal: GtmSignal;
}

export interface GtmSignalPatch {
  webhook_test_url?: string;
  webhook_prod_url?: string;
  webhook_target?: WebhookTarget;
  is_active?: boolean;
}

export async function getGtmSignals(): Promise<GtmSignalsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/signals`, {
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) throw new Error(`signals fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as GtmSignalsResponse;
}

export async function patchGtmSignal(
  signalSlug: string,
  patch: GtmSignalPatch,
): Promise<GtmSignal> {
  const res = await fetch(`${API_BASE}/api/v1/signals/${encodeURIComponent(signalSlug)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`signal patch failed: ${res.status} ${await res.text()}`);
  }
  const env = (await res.json()) as GtmSignalEnvelope;
  return env.signal;
}

export async function deleteGtmSignal(signalSlug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/signals/${encodeURIComponent(signalSlug)}`, {
    method: "DELETE",
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) {
    throw new Error(`signal delete failed: ${res.status} ${await res.text()}`);
  }
}

export interface GtmSignalFireRequest {
  target?: WebhookTarget;
  limit?: number;
}

export interface GtmSignalDispatchResult {
  status: number | string;
  elapsed_ms: number;
  body_bytes: number;
  exception_type?: string;
  exception?: string;
}

export interface GtmSignalFireResult {
  slug: string;
  webhook_target: WebhookTarget;
  webhook_url: string;
  matched_rows_total: number;
  sent_rows: number;
  limit_applied: number | null;
  dispatch: GtmSignalDispatchResult;
}

// Spawn response — returned immediately by POST /signals/:slug/fire. The UI
// then polls GET /signals/fire/status/:call_id until status === "done".
export interface GtmSignalFireSpawn {
  call_id: string;
  status: "pending";
  slug: string;
}

// Status poll response shape. "pending" = still running, "done" = result attached.
export type GtmSignalFireStatus =
  | { call_id: string; status: "pending" }
  | { call_id: string; status: "done"; result: GtmSignalFireResult };

export async function fireGtmSignal(
  signalSlug: string,
  body: GtmSignalFireRequest = {},
): Promise<GtmSignalFireSpawn> {
  const res = await fetch(`${API_BASE}/api/v1/signals/${encodeURIComponent(signalSlug)}/fire`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`signal fire failed: ${res.status} ${await res.text()}`);
  }
  const env = (await res.json()) as { data: GtmSignalFireSpawn };
  return env.data;
}

export async function fireGtmSignalStatus(callId: string): Promise<GtmSignalFireStatus> {
  const res = await fetch(`${API_BASE}/api/v1/signals/fire/status/${encodeURIComponent(callId)}`, {
    headers: { Authorization: await bearer() },
  });
  if (!res.ok) {
    throw new Error(`signal fire status failed: ${res.status} ${await res.text()}`);
  }
  const env = (await res.json()) as { data: GtmSignalFireStatus };
  return env.data;
}
