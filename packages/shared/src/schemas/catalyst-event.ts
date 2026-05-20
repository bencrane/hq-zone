import { z } from "zod";
import { isoTimestampSchema, uuidSchema } from "./common";

/**
 * Catalyst event — the core data primitive of Rare Structure HQ.
 *
 * A catalyst event is an observed structural/market signal that may trigger an
 * origination thesis: a regulatory shift, a financing round, a leadership
 * change, a supply-chain dislocation, etc. The platform ingests catalyst events,
 * scores them, and routes the material ones into the origination pipeline.
 *
 * This file is the future data seam. It is intentionally a SCAFFOLD — one schema
 * + its inferred type, structured to grow. The catalyst-signal data layer beyond
 * this scaffold is a later cycle.
 */

/**
 * The kind of structural signal a catalyst event represents. New kinds are added
 * here as the origination taxonomy is formalized.
 */
export const catalystKindSchema = z.enum([
  "regulatory",
  "financing",
  "leadership",
  "supply_chain",
  "litigation",
  "market_structure",
  "other",
]);
export type CatalystKind = z.infer<typeof catalystKindSchema>;

/** How material the signal is judged to be for origination. */
export const catalystSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type CatalystSeverity = z.infer<typeof catalystSeveritySchema>;

/** Pipeline status of a catalyst event after ingestion. */
export const catalystStatusSchema = z.enum(["ingested", "triaged", "thesis_open", "dismissed"]);
export type CatalystStatus = z.infer<typeof catalystStatusSchema>;

/**
 * Geographic anchor for a catalyst event — where the structural signal is
 * physically located. Optional on the event itself (a signal need not be
 * geo-resolvable), but when present it is what plots the event on the
 * origination map. `lon`/`lat` are WGS-84 decimal degrees; `region` is a
 * human label (a US state, a metro, a jurisdiction).
 */
export const catalystLocationSchema = z.object({
  /** WGS-84 longitude, decimal degrees. */
  lon: z.number().min(-180).max(180),
  /** WGS-84 latitude, decimal degrees. */
  lat: z.number().min(-90).max(90),
  /** Human-readable region label — e.g. "Texas", "Permian Basin, TX". */
  region: z.string().min(1),
});
export type CatalystLocation = z.infer<typeof catalystLocationSchema>;

/**
 * A single catalyst event. The required core (id / kind / severity / headline /
 * occurred_at / source / status) is stable; optional fields are the growth seam.
 */
export const catalystEventSchema = z.object({
  /** Stable identifier. */
  id: uuidSchema,
  /** Structural classification of the signal. */
  kind: catalystKindSchema,
  /** Origination materiality. */
  severity: catalystSeveritySchema,
  /** One-line human summary of the signal. */
  headline: z.string().min(1).max(280),
  /** When the underlying event occurred (not when it was ingested). */
  occurred_at: isoTimestampSchema,
  /** When the platform ingested the signal. */
  ingested_at: isoTimestampSchema,
  /** Provenance — where the signal came from (feed name, URL, analyst, etc.). */
  source: z.string().min(1),
  /** Current pipeline status. */
  status: catalystStatusSchema.default("ingested"),
  // ── growth seam: optional, additive fields ────────────────────────────────
  /** Free-text detail / analyst notes. */
  summary: z.string().optional(),
  /** Entities (companies, sectors, jurisdictions) the signal touches. */
  tags: z.array(z.string()).default([]),
  /** 0–1 confidence the signal is real and material; null until scored. */
  confidence: z.number().min(0).max(1).nullable().default(null),
  /** Where the signal is physically anchored — drives the origination map. */
  location: catalystLocationSchema.optional(),
});
export type CatalystEvent = z.infer<typeof catalystEventSchema>;

/** Shape accepted when creating a catalyst event — server assigns id + timestamps. */
export const catalystEventCreateSchema = catalystEventSchema.omit({
  id: true,
  ingested_at: true,
});
export type CatalystEventCreate = z.infer<typeof catalystEventCreateSchema>;
