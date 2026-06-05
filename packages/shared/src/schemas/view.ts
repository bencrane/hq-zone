/**
 * View — a persistent, materialized cohort definition.
 *
 * A view is a structured criteria-spec over one or more upstream sources
 * (Polaris-registered Lance datasets, Lance bridges, or virtual sources
 * defined in DEX overlays). The spec is deterministic: a UI form (or
 * managed agent) composes it, a compiler turns it into SQL / Lance
 * scanner predicates, and the membership materializes to a count
 * (cheap, on-demand) and/or a row-set (materialized as a Lance dataset
 * registered in Polaris under the `views` namespace).
 *
 * Two compute modes on the backend:
 *   - /compute       — stateless COUNT(DISTINCT pk). Fast (~3s). Used during
 *                      authoring iteration.
 *   - /materialize   — emits a Lance dataset under
 *                      polaris-warehouse/views/<slug>_lance/, registers in
 *                      Polaris, sets materialized_uri/materialized_at/row_count.
 *                      The materialized view becomes a first-class source —
 *                      future views can reference it via sources: [{source_id:
 *                      "views.<slug>_lance"}].
 *
 * The source catalog is NOT hardcoded in this file — it's fetched from the
 * BFF `/api/v1/views/catalog/sources` endpoint, which proxies to core-x →
 * DEX's Polaris-driven catalog (139+ Lance datasets across 28 namespaces +
 * virtual overlays).
 *
 * Same schema is consumed by:
 *   - the platform-app form / future managed-agent chat surface
 *   - the platform-api BFF (passthrough)
 *   - core-x (passthrough + storage + compute + materialize)
 */

import { z } from "zod";

import { isoTimestampSchema, uuidSchema } from "./common";

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

export const viewOperatorSchema = z.enum([
  "is_null",
  "is_not_null",
  "eq",
  "neq",
  "in",
  "not_in",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "between_relative_days",
]);
export type ViewOperator = z.infer<typeof viewOperatorSchema>;

// ---------------------------------------------------------------------------
// Field types — drive the UI input control + value validation
// ---------------------------------------------------------------------------

export const viewFieldTypeSchema = z.enum([
  "enum_nullable",
  "enum",
  "number",
  "date",
  "text",
  "boolean",
]);
export type ViewFieldType = z.infer<typeof viewFieldTypeSchema>;

export const viewEntityGrainSchema = z.enum(["uei", "dot_number", "lei", "pdl_id", "ein"]);
export type ViewEntityGrain = z.infer<typeof viewEntityGrainSchema>;

// ---------------------------------------------------------------------------
// Source spec — which upstream the view reads from
// ---------------------------------------------------------------------------

export const viewSourceKindSchema = z.enum([
  "lance_dataset", // Lance dataset in R2/Polaris
  "lance_parquet_glob", // raw R2 parquet glob (virtual source via overlay)
  "lance_bridge", // Lance bridge dataset (Pattern B)
]);
export type ViewSourceKind = z.infer<typeof viewSourceKindSchema>;

export const viewSourceSchema = z.object({
  source_id: z.string().min(1),
});
export type ViewSource = z.infer<typeof viewSourceSchema>;

// ---------------------------------------------------------------------------
// Criterion — one filter
// ---------------------------------------------------------------------------

export const viewCriterionSchema = z.object({
  field: z.string().min(1),
  operator: viewOperatorSchema,
  // value shape depends on operator:
  //   is_null / is_not_null      -> value MUST be undefined
  //   eq / neq / gt / gte / lt / lte -> primitive (string | number | boolean)
  //   in / not_in                -> array of primitives
  //   between                    -> [min, max] tuple
  //   between_relative_days      -> { n_days_back: number }
  value: z.unknown().optional(),
});
export type ViewCriterion = z.infer<typeof viewCriterionSchema>;

// ---------------------------------------------------------------------------
// Spec — the authored definition (what a UI form submits)
// ---------------------------------------------------------------------------

export const viewSpecSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  entity_grain: viewEntityGrainSchema,
  sources: z.array(viewSourceSchema).min(1),
  criteria: z.array(viewCriterionSchema).default([]),
});
export type ViewSpec = z.infer<typeof viewSpecSchema>;

// ---------------------------------------------------------------------------
// View — persisted entity (spec + identity + compute + materialization metadata)
// ---------------------------------------------------------------------------

export const viewSchema = viewSpecSchema.extend({
  id: uuidSchema,
  created_at: isoTimestampSchema,
  updated_at: isoTimestampSchema,
  // /compute (stateless COUNT(DISTINCT pk)). Null until first compute or
  // after a spec patch (which invalidates).
  computed_count: z.number().int().nullable().default(null),
  computed_at: isoTimestampSchema.nullable().default(null),
  // /materialize (Lance emit + Polaris register). Null until first materialize
  // or after a spec patch.
  materialized_uri: z.string().nullable().default(null),
  materialized_at: isoTimestampSchema.nullable().default(null),
  // row_count   = ds.count_rows() on the materialized dataset (action grain —
  //               one row per matching source row).
  // entity_count = DISTINCT(entity_grain) — the cohort size operators care
  //                about ("how many companies?").
  row_count: z.number().int().nullable().default(null),
  entity_count: z.number().int().nullable().default(null),
});
export type View = z.infer<typeof viewSchema>;

// ---------------------------------------------------------------------------
// Catalog wire shape — fetched from the BFF, NOT hardcoded here.
// (The DEX side serves this from polaris_catalog.serialize_source().)
// ---------------------------------------------------------------------------

export const viewFieldOptionSchema = z.object({
  value: z.unknown(),
  label: z.string(),
});
export type ViewFieldOption = z.infer<typeof viewFieldOptionSchema>;

export const viewFieldSchema = z.object({
  name: z.string(),
  display: z.string(),
  description: z.string().optional(),
  type: viewFieldTypeSchema,
  options: z.array(viewFieldOptionSchema).optional(),
  operators: z.array(viewOperatorSchema).min(1),
});
export type ViewField = z.infer<typeof viewFieldSchema>;

export const viewSourceCatalogEntrySchema = z.object({
  source_id: z.string(),
  display_name: z.string(),
  description: z.string(),
  kind: viewSourceKindSchema,
  identifier: z.string(),
  entity_grain: viewEntityGrainSchema,
  pk_column: z.string().optional(),
  fields: z.array(viewFieldSchema),
});
export type ViewSourceCatalogEntry = z.infer<typeof viewSourceCatalogEntrySchema>;

/** Look up a source-catalog entry by id from a backend-fetched catalog. */
export function findViewSource(
  catalog: ViewSourceCatalogEntry[],
  source_id: string,
): ViewSourceCatalogEntry | undefined {
  return catalog.find((s) => s.source_id === source_id);
}

/** Look up a field on a source from a backend-fetched catalog. */
export function findViewField(
  catalog: ViewSourceCatalogEntry[],
  source_id: string,
  field_name: string,
): ViewField | undefined {
  const source = findViewSource(catalog, source_id);
  return source?.fields.find((f) => f.name === field_name);
}
