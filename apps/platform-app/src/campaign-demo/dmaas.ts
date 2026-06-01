/**
 * DMaaS client for the Campaign Configurator & Demo (`/campaigns/demo`).
 *
 * Talks DIRECTLY to hq-x's `/api/v1/dmaas/*` router — not through the
 * platform-api BFF. Rationale: every dmaas route authenticates with
 * `verify_supabase_jwt`, i.e. the operator's OWN Supabase JWT in the
 * `Authorization` header — exactly the token the browser already holds. The
 * BFF exists to swap in the static service token for routes that need it
 * (sam-opps, coverage, signals → `verify_backend_x_token`); dmaas needs no
 * such secret, so the BFF would add a hop with zero value. hq-x already
 * allow-lists the platform-app origin for CORS ("the direct browser client").
 *
 * Base URL: VITE_HQX_API_URL (e.g. http://localhost:8000 in dev, the hq-x
 * Railway URL in prod). Falls back to same-origin so a missing var fails loud
 * at the network layer rather than silently hitting the BFF.
 *
 * Response shape note: dmaas returns its Pydantic models DIRECTLY (no DEX-style
 * `{ data: ... }` envelope), so callers consume the JSON as-is. Errors arrive
 * as FastAPI `{ detail: { error, ... } }` — `request()` unwraps them into a
 * typed DmaasError that preserves solver conflicts for the canvas to explain.
 */
import { supabase } from "@/lib/supabase";

const HQX_BASE = (import.meta.env.VITE_HQX_API_URL as string | undefined) ?? "";

if (!HQX_BASE) {
  // eslint-disable-next-line no-console
  console.warn("campaign-demo: VITE_HQX_API_URL missing — calling hq-x same-origin.");
}

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

// ─────────────────────────── Wire types (mirror app/models/dmaas.py) ───────────

/** Axis-aligned rectangle in pixel coordinates, top-left origin. Matches the
 *  solver's `Rect.to_dict()` — every value in `resolved_positions` is one. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The backend-solved layout: element name → its absolute pixel rect. The
 *  canvas renders this verbatim; no constraint solving happens client-side. */
export type ResolvedPositions = Record<string, Rect>;

export type ScaffoldFormat = "postcard" | "letter" | "self_mailer" | "snap_pack" | "booklet";
export type ScaffoldStrategy = "hero" | "proof" | "offer" | "trust";

export interface CompatibleSpec {
  category: string;
  variant: string;
}

export interface Scaffold {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  format: ScaffoldFormat;
  strategy: ScaffoldStrategy | null;
  compatible_specs: CompatibleSpec[];
  prop_schema: Record<string, unknown>;
  constraint_specification: Record<string, unknown>;
  preview_image_url: string | null;
  vertical_tags: string[];
  is_active: boolean;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export interface ScaffoldListResponse {
  count: number;
  scaffolds: Scaffold[];
}

export interface Design {
  id: string;
  scaffold_id: string;
  spec_category: string;
  spec_variant: string;
  content_config: Record<string, unknown>;
  resolved_positions: ResolvedPositions;
  brand_id: string | null;
  audience_template_id: string | null;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export interface DesignListResponse {
  count: number;
  designs: Design[];
}

export interface DesignCreateRequest {
  scaffold_id: string;
  spec_category: string;
  spec_variant: string;
  content_config: Record<string, unknown>;
  brand_id?: string | null;
  audience_template_id?: string | null;
}

/** One constraint the solver could not satisfy — surfaced so the operator
 *  sees WHY a design didn't solve during a live call, not a bare 400. */
export interface ConstraintConflict {
  constraint_index: number;
  constraint_type: string;
  phase: "prevalidate" | "linear" | "validator";
  message: string;
  detail?: Record<string, unknown>;
}

/** Envelope shared by validate / preview / (internally) save. `canvas` is the
 *  mailpiece boundary in the same pixel space as `positions`; `zones` are the
 *  named regions the solver bound elements into — both ideal as canvas guides. */
export interface SolveResult {
  is_valid: boolean;
  positions: ResolvedPositions;
  conflicts: ConstraintConflict[];
  canvas: Rect | null;
  zones: Record<string, Rect>;
}

export interface PreviewRequest {
  spec_category: string;
  spec_variant: string;
  placeholder_content?: Record<string, unknown> | null;
}

export interface ScaffoldListParams {
  format?: ScaffoldFormat;
  vertical?: string;
  spec_category?: string;
  strategy?: ScaffoldStrategy;
}

// ─────────────────────────── Error handling ────────────────────────────────

/** A structured dmaas failure. `code` is hq-x's `detail.error` discriminator
 *  ("scaffold_does_not_solve", "content_schema_violation", …); `conflicts` and
 *  `schemaErrors` are populated when the body carries them. */
export class DmaasError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly conflicts: ConstraintConflict[];
  readonly schemaErrors: string[];

  constructor(
    message: string,
    status: number,
    code: string | null,
    conflicts: ConstraintConflict[] = [],
    schemaErrors: string[] = [],
  ) {
    super(message);
    this.name = "DmaasError";
    this.status = status;
    this.code = code;
    this.conflicts = conflicts;
    this.schemaErrors = schemaErrors;
  }
}

function toDmaasError(status: number, body: string): DmaasError {
  // FastAPI wraps raised HTTPException payloads under `detail`. dmaas raises
  // `HTTPException(4xx, { error, ... })`, so detail is an object we can mine.
  let detail: unknown = body;
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    detail = parsed.detail ?? parsed;
  } catch {
    // non-JSON body — keep the raw text as the message below.
  }

  if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    const code = typeof d.error === "string" ? d.error : null;
    const conflicts = Array.isArray(d.conflicts) ? (d.conflicts as ConstraintConflict[]) : [];
    const schemaErrors = Array.isArray(d.errors) ? (d.errors as string[]) : [];
    const message = (typeof d.message === "string" && d.message) || code || `dmaas ${status}`;
    return new DmaasError(message, status, code, conflicts, schemaErrors);
  }
  return new DmaasError(typeof detail === "string" ? detail : `dmaas ${status}`, status, null);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${HQX_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: await bearer(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw toDmaasError(res.status, text);
  return (text ? JSON.parse(text) : null) as T;
}

function queryString(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// ─────────────────────────── Calls ─────────────────────────────────────────

/** GET /api/v1/dmaas/scaffolds — the scaffold catalog (optionally filtered). */
export async function listScaffolds(
  params: ScaffoldListParams = {},
): Promise<ScaffoldListResponse> {
  return request<ScaffoldListResponse>(
    `/api/v1/dmaas/scaffolds${queryString({
      format: params.format,
      vertical: params.vertical,
      spec_category: params.spec_category,
      strategy: params.strategy,
    })}`,
  );
}

/** GET /api/v1/dmaas/scaffolds/:slug — one scaffold (prop_schema, specs, …). */
export async function getScaffold(slug: string): Promise<Scaffold> {
  return request<Scaffold>(`/api/v1/dmaas/scaffolds/${encodeURIComponent(slug)}`);
}

/**
 * POST /api/v1/dmaas/scaffolds/:slug/preview — solve WITHOUT persisting.
 * The live-demo workhorse: returns positions + the canvas boundary + zone
 * guides for a given spec, so the operator can iterate content on the call
 * without writing a row per keystroke. (Design creation is the commit step.)
 */
export async function previewScaffold(slug: string, body: PreviewRequest): Promise<SolveResult> {
  return request<SolveResult>(`/api/v1/dmaas/scaffolds/${encodeURIComponent(slug)}/preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * POST /api/v1/dmaas/designs — the design creation endpoint. Validates content
 * against the scaffold's prop_schema, solves the layout, and persists. Returns
 * the Design with its `resolved_positions` — the value the canvas renders.
 * Throws DmaasError("design_does_not_solve", conflicts=[…]) when unsatisfiable.
 */
export async function createDesign(body: DesignCreateRequest): Promise<Design> {
  return request<Design>("/api/v1/dmaas/designs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** GET /api/v1/dmaas/designs — prior designs (filter by brand / scaffold). */
export async function listDesigns(
  params: {
    brand_id?: string;
    scaffold_id?: string;
    audience_template_id?: string;
    limit?: number;
  } = {},
): Promise<DesignListResponse> {
  return request<DesignListResponse>(
    `/api/v1/dmaas/designs${queryString({
      brand_id: params.brand_id,
      scaffold_id: params.scaffold_id,
      audience_template_id: params.audience_template_id,
      limit: params.limit?.toString(),
    })}`,
  );
}

/** GET /api/v1/dmaas/designs/:id — re-open a persisted design. */
export async function getDesign(designId: string): Promise<Design> {
  return request<Design>(`/api/v1/dmaas/designs/${encodeURIComponent(designId)}`);
}
