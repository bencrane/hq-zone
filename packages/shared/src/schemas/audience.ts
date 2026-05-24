/**
 * Audience — a persistent, UI-authorable cohort definition.
 *
 * An audience is a structured criteria-spec over one or more upstream data
 * sources (Lance datasets / Lance bridges / api-delta parquet globs). The
 * spec is deterministic: a UI form composes it, a compiler turns it into
 * SQL / Lance scanner predicates, and the membership materializes to a
 * count + (eventually) a row-set.
 *
 * Same schema is consumed by:
 *   - the platform-app form (field catalog drives the UI)
 *   - the platform-api BFF (validates and stores the spec)
 *   - data-engine-x downstream (when storage moves there) — same field names,
 *     same operator vocabulary, same source identifiers
 *
 * Storage decision: in v1 the BFF persists audiences in-memory (process
 * local). The Zod schema is the contract that data-engine-x will conform
 * to when that storage moves.
 */

import { z } from "zod";

import { isoTimestampSchema, uuidSchema } from "./common";

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

/**
 * Predicate operators the compiler knows how to translate.
 *
 * - is_null / is_not_null — for nullable enum fields (e.g. FPDS action_type)
 * - eq / neq / in / not_in — for enum fields
 * - gt / gte / lt / lte — for numeric and date fields
 * - between — value is [min, max] (numeric or ISO-date)
 * - between_relative_days — value is { n_days_back }, resolves at compile
 *   time to action_date BETWEEN CURRENT_DATE - n_days_back AND CURRENT_DATE
 */
export const audienceOperatorSchema = z.enum([
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
export type AudienceOperator = z.infer<typeof audienceOperatorSchema>;

// ---------------------------------------------------------------------------
// Field types — drive the UI input control + value validation
// ---------------------------------------------------------------------------

export const audienceFieldTypeSchema = z.enum([
  "enum_nullable",
  "enum",
  "number",
  "date",
  "text",
  "boolean",
]);
export type AudienceFieldType = z.infer<typeof audienceFieldTypeSchema>;

export const audienceEntityGrainSchema = z.enum(["uei", "dot_number", "lei", "pdl_id", "ein"]);
export type AudienceEntityGrain = z.infer<typeof audienceEntityGrainSchema>;

// ---------------------------------------------------------------------------
// Source spec — which upstream the audience reads from
// ---------------------------------------------------------------------------

export const audienceSourceKindSchema = z.enum([
  "lance_dataset", // Lance dataset in R2/Polaris
  "lance_parquet_glob", // raw R2 parquet glob (api-delta hot zone)
  "lance_bridge", // Lance bridge dataset (Pattern B)
]);
export type AudienceSourceKind = z.infer<typeof audienceSourceKindSchema>;

export const audienceSourceSchema = z.object({
  source_id: z.string().min(1), // matches a key in AUDIENCE_SOURCE_CATALOG
});
export type AudienceSource = z.infer<typeof audienceSourceSchema>;

// ---------------------------------------------------------------------------
// Criterion — one filter
// ---------------------------------------------------------------------------

export const audienceCriterionSchema = z.object({
  field: z.string().min(1), // matches a field in the source's catalog entry
  operator: audienceOperatorSchema,
  // value shape depends on operator:
  //   is_null / is_not_null      -> value MUST be undefined
  //   eq / neq / gt / gte / lt / lte -> primitive (string | number | boolean)
  //   in / not_in                -> array of primitives
  //   between                    -> [min, max] tuple
  //   between_relative_days      -> { n_days_back: number }
  value: z.unknown().optional(),
});
export type AudienceCriterion = z.infer<typeof audienceCriterionSchema>;

// ---------------------------------------------------------------------------
// Spec — the authored definition (what a UI form submits)
// ---------------------------------------------------------------------------

export const audienceSpecSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  entity_grain: audienceEntityGrainSchema,
  sources: z.array(audienceSourceSchema).min(1),
  criteria: z.array(audienceCriterionSchema).default([]),
});
export type AudienceSpec = z.infer<typeof audienceSpecSchema>;

// ---------------------------------------------------------------------------
// Audience — persisted entity (spec + identity + materialization metadata)
// ---------------------------------------------------------------------------

export const audienceSchema = audienceSpecSchema.extend({
  id: uuidSchema,
  created_at: isoTimestampSchema,
  updated_at: isoTimestampSchema,
  // Last-computed membership count. Null until first materialization.
  computed_count: z.number().int().nullable().default(null),
  computed_at: isoTimestampSchema.nullable().default(null),
});
export type Audience = z.infer<typeof audienceSchema>;

// ---------------------------------------------------------------------------
// Field option (for enum / enum_nullable fields)
// ---------------------------------------------------------------------------

export const audienceFieldOptionSchema = z.object({
  value: z.unknown(), // includes null for enum_nullable
  label: z.string(),
});
export type AudienceFieldOption = z.infer<typeof audienceFieldOptionSchema>;

// ---------------------------------------------------------------------------
// Field catalog entry — drives the UI for one field of one source
// ---------------------------------------------------------------------------

export const audienceFieldSchema = z.object({
  name: z.string(),
  display: z.string(),
  description: z.string().optional(),
  type: audienceFieldTypeSchema,
  options: z.array(audienceFieldOptionSchema).optional(),
  operators: z.array(audienceOperatorSchema).min(1),
});
export type AudienceField = z.infer<typeof audienceFieldSchema>;

// ---------------------------------------------------------------------------
// Source catalog entry — one upstream the operator can author against
// ---------------------------------------------------------------------------

export const audienceSourceCatalogEntrySchema = z.object({
  source_id: z.string(),
  display_name: z.string(),
  description: z.string(),
  kind: audienceSourceKindSchema,
  identifier: z.string(), // e.g. "usaspending/contracts_lance" or "s3://.../api-delta/*"
  entity_grain: audienceEntityGrainSchema,
  fields: z.array(audienceFieldSchema),
});
export type AudienceSourceCatalogEntry = z.infer<typeof audienceSourceCatalogEntrySchema>;

// ---------------------------------------------------------------------------
// V1 source catalog — minimal; just USAspending prime contracts for now.
// New sources are pure adds; the UI re-renders from the catalog.
// ---------------------------------------------------------------------------

export const AUDIENCE_SOURCE_CATALOG: AudienceSourceCatalogEntry[] = [
  {
    source_id: "usaspending_contracts",
    display_name: "USAspending — Prime Contracts (FPDS)",
    description:
      "Federal prime contract transactions. Each row is one FPDS action against an award: brand-new contract, funding bump, option exercised, change order, termination, etc. Read path UNIONs the structured Lance dataset (cold) with the api-delta parquet glob (hot, last ~24h).",
    kind: "lance_parquet_glob",
    identifier: "s3://dex-raw-landing-zone/usaspending/contracts/api-delta/date=*/data.parquet",
    entity_grain: "uei",
    fields: [
      {
        name: "action_type",
        display: "Action type",
        description:
          "Brand-new contract = action_type IS NULL. Letter codes (A, B, C…) are modifications.",
        type: "enum_nullable",
        operators: ["is_null", "is_not_null", "eq", "neq", "in", "not_in"],
        options: [
          { value: null, label: "(NULL — brand-new contract, not a modification)" },
          { value: "A", label: "A — Additional Work (new agreement required)" },
          { value: "B", label: "B — Supplemental Agreement (within scope)" },
          { value: "C", label: "C — Funding Only Action" },
          { value: "D", label: "D — Change Order" },
          { value: "E", label: "E — Terminate for Default" },
          { value: "F", label: "F — Terminate for Convenience" },
          { value: "G", label: "G — Exercise an Option" },
          { value: "H", label: "H — Definitize Letter Contract" },
          { value: "J", label: "J — Novation Agreement" },
          { value: "K", label: "K — Close Out" },
          { value: "L", label: "L — Definitize Change Order" },
          { value: "M", label: "M — Other Administrative Action" },
          { value: "N", label: "N — Legal Contract Cancellation" },
          { value: "P", label: "P — Rerepresentation Non-Novated Merger" },
          { value: "R", label: "R — Rerepresentation" },
          { value: "S", label: "S — Change PIID" },
          { value: "T", label: "T — Transfer Action" },
          { value: "V", label: "V — UEI/Name Change" },
          { value: "W", label: "W — Address Change" },
          { value: "X", label: "X — Terminate for Cause" },
          { value: "Y", label: "Y — Add Subcontracting Plan" },
        ],
      },
      {
        name: "federal_action_obligation",
        display: "Obligated dollar amount",
        description: "Per-action dollar amount. Positive = money added; negative = deobligation.",
        type: "number",
        operators: ["gt", "gte", "lt", "lte", "between"],
      },
      {
        name: "action_date",
        display: "Action date",
        description:
          "Date the action occurred (FPDS reporting). Use 'in the past N days' for rolling-window cohorts.",
        type: "date",
        operators: ["between_relative_days", "between", "gte", "lte"],
      },
      {
        name: "award_type",
        display: "Award type",
        description: "FPDS award-type code.",
        type: "enum",
        operators: ["eq", "neq", "in", "not_in"],
        options: [
          { value: "A", label: "A — BPA Call" },
          { value: "B", label: "B — Purchase Order" },
          { value: "C", label: "C — Delivery Order" },
          { value: "D", label: "D — Definitive Contract" },
        ],
      },
    ],
  },
];

/** Look up a source-catalog entry by id. Throws if not found. */
export function getAudienceSource(source_id: string): AudienceSourceCatalogEntry {
  const found = AUDIENCE_SOURCE_CATALOG.find((s) => s.source_id === source_id);
  if (!found) throw new Error(`Unknown audience source: ${source_id}`);
  return found;
}

/** Look up a field on a source. Throws if either source or field is unknown. */
export function getAudienceField(source_id: string, field_name: string): AudienceField {
  const source = getAudienceSource(source_id);
  const found = source.fields.find((f) => f.name === field_name);
  if (!found) throw new Error(`Unknown field '${field_name}' on source '${source_id}'`);
  return found;
}
