/**
 * Dummy data for the catalyst map demo — the single isolated data module.
 *
 * Everything the demo plots and renders comes from here. It is deliberately
 * hardcoded: the experience, rhythm, and design get nailed before any real
 * catalyst-signal pipeline is wired in. When real data arrives, this one
 * module is the swap point — nothing else in `src/demo/**` reads data
 * directly.
 *
 * The contract: every plotted catalyst is built around a `CatalystEvent`
 * record that is **validated at module load against `catalystEventSchema`
 * from `@rare-structure-hq/shared`** (see `CATALYST_EVENTS` below — the
 * `.parse()` call is the guarantee). The demo-presentation fields the UI
 * needs on top of the schema core (callout copy, thesis-fit reasoning,
 * deal scale) hang off a thin `DemoCatalyst` wrapper, with the validated
 * `CatalystEvent` as its typed spine.
 *
 * The cartographic geometry (state outlines, the scatter field, the catalyst
 * point pixel coordinates) lives in `us-geo.ts` — GENERATED, joined here by
 * id. The non-geographic demo copy (firehose count, the thesis-scan steps)
 * is also here.
 */

import {
  type CatalystEvent,
  type CatalystKind,
  catalystEventSchema,
} from "@rare-structure-hq/shared";
import { GEO_CATALYST_POINTS, type GeoCatalystPoint } from "./us-geo";

// ───────────────────────────────────────────────────────────────────
// The viewer — a capital partner. The demo runs from this firm's seat;
// the Match phase scores catalysts against this thesis.
// ───────────────────────────────────────────────────────────────────

export type CapitalPartner = {
  /** Display name of the partner firm. */
  name: string;
  /** Short institutional descriptor. */
  kind: string;
  /** The structural thesis the firm originates against. */
  thesisLine: string;
  /** Check size the firm writes. */
  checkSize: string;
  /** Stage / structural posture. */
  posture: string;
  /** Sectors the thesis covers. */
  sectors: string[];
  /** Geographies the thesis covers. */
  geographies: string[];
  /** The catalyst kinds the thesis is tuned to. */
  catalystKinds: CatalystKind[];
};

export const CAPITAL_PARTNER: CapitalPartner = {
  name: "Cardinal Bluff Capital",
  kind: "Structural-origination partner",
  thesisLine:
    "Control positions in industrials and energy infrastructure dislocated by regulatory and supply-chain structural change.",
  checkSize: "$40M – $120M equity",
  posture: "Control / structured minority",
  sectors: ["Energy infrastructure", "Industrials", "Materials"],
  geographies: ["US — Gulf, Mountain West, Great Lakes"],
  catalystKinds: ["regulatory", "supply_chain", "market_structure", "financing"],
};

// Headline catalyst universe count — shown in the terminal header. The map
// plots the showpiece subset; this is the firehose the engine watches.
export const ACTIVE_CATALYST_COUNT = 8_412;

// ───────────────────────────────────────────────────────────────────
// Phase 2 — the staged thesis-resolution scan. Each step is a discrete
// line in the terminal scan; the demo cascades the firehose down to the
// thesis-matched set. Copy is plain: what the engine is actually doing.
// ───────────────────────────────────────────────────────────────────

export type ScanStep = {
  label: string;
  detail: string;
};

export const SCAN_STEPS: ScanStep[] = [
  { label: "Loading partner thesis", detail: "Cardinal Bluff Capital" },
  { label: "Filtering catalyst firehose", detail: "8,412 live signals" },
  { label: "Scoring structural fit", detail: "sector · geography · kind" },
  { label: "Ranking matched catalysts", detail: "thesis-weighted" },
];

/** Per-step hold (ms). Sum + the final settle = the full scan duration. */
export const SCAN_STEP_MS = 460;

// ───────────────────────────────────────────────────────────────────
// The plotted catalysts.
//
// Each `DemoCatalyst` carries a `CatalystEvent` (the validated schema
// spine) plus the demo-presentation fields. `geoId` joins to the pixel
// coordinates in `us-geo.ts`.
// ───────────────────────────────────────────────────────────────────

/** A thesis-fit signal — one reason the engine routed a catalyst. */
export type ThesisReason = {
  kind: "sector" | "geo" | "catalyst-kind" | "scale" | "timing";
  label: string;
};

/** A plotted catalyst — schema-validated event + demo-presentation fields. */
export type DemoCatalyst = {
  /** Joins to `GEO_CATALYST_POINTS` in `us-geo.ts`. */
  geoId: string;
  /** The validated schema record — the typed, contract-conforming spine. */
  event: CatalystEvent;
  /** Short label shown in the map callout (e.g. the entity / asset). */
  subject: string;
  /** Deal-scale framing shown in the callout + modal. */
  scale: string;
  /** 0–100 thesis-fit score — demo display only. */
  thesisFit: number;
  /** Why the engine routed this catalyst to the partner. */
  thesisReasons: ThesisReason[];
};

/**
 * Raw catalyst seeds. The `event` object on each is `.parse()`d through
 * `catalystEventSchema` below — so every record provably conforms to the
 * `@rare-structure-hq/shared` contract, including the optional `location`
 * field that drives map plotting.
 */
const CATALYST_SEEDS: Array<{
  geoId: string;
  subject: string;
  scale: string;
  thesisFit: number;
  thesisReasons: ThesisReason[];
  event: CatalystEvent;
}> = [
  {
    geoId: "permian-tx",
    subject: "Permian midstream operator",
    scale: "$310M enterprise value",
    thesisFit: 96,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Regulatory — methane rule forces capital reallocation" },
      { kind: "sector", label: "Energy infrastructure — core thesis sector" },
      { kind: "geo", label: "Permian Basin — within the Gulf coverage geography" },
      { kind: "scale", label: "Fits the $40M–$120M control-equity range" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111101",
      kind: "regulatory",
      severity: "critical",
      headline: "Final methane rule strands gathering capacity across Permian midstream",
      occurred_at: "2026-05-12T14:00:00Z",
      ingested_at: "2026-05-12T16:20:00Z",
      source: "regulatory-feed · EPA docket",
      status: "thesis_open",
      summary:
        "The finalized methane rule compresses the economics of legacy gathering systems, forcing operators into a recapitalization window — a control-equity opening for a structural buyer.",
      tags: ["energy", "midstream", "Permian", "methane-rule"],
      confidence: 0.91,
      location: { lon: -102.0779, lat: 31.9974, region: "Permian Basin, TX" },
    }),
  },
  {
    geoId: "bay-area-ca",
    subject: "Grid-scale storage developer",
    scale: "$85M growth round",
    thesisFit: 88,
    thesisReasons: [
      {
        kind: "catalyst-kind",
        label: "Financing — bridge round signals a structured-entry window",
      },
      { kind: "sector", label: "Energy infrastructure — core thesis sector" },
      { kind: "scale", label: "Within the structured-minority check range" },
      { kind: "timing", label: "Round closing inside 60 days — actionable now" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111102",
      kind: "financing",
      severity: "high",
      headline: "Grid-scale storage developer opens bridge round amid interconnection backlog",
      occurred_at: "2026-05-09T09:30:00Z",
      ingested_at: "2026-05-09T12:05:00Z",
      source: "financing-feed · proprietary",
      status: "triaged",
      summary:
        "An interconnection-queue delay has pushed a well-regarded storage developer into a bridge round — a structured-entry window ahead of a larger raise.",
      tags: ["energy", "storage", "California", "bridge-round"],
      confidence: 0.78,
      location: { lon: -122.2712, lat: 37.8044, region: "Bay Area, CA" },
    }),
  },
  {
    geoId: "gulf-la",
    subject: "Gulf petrochemical complex",
    scale: "$520M carve-out",
    thesisFit: 92,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Supply-chain — feedstock dislocation forces a carve-out" },
      { kind: "sector", label: "Materials — core thesis sector" },
      { kind: "geo", label: "Gulf Coast — within the coverage geography" },
      { kind: "catalyst-kind", label: "Market-structure shift in feedstock pricing" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111103",
      kind: "supply_chain",
      severity: "high",
      headline: "Feedstock dislocation pushes Gulf petrochemical parent to carve out a complex",
      occurred_at: "2026-05-06T11:00:00Z",
      ingested_at: "2026-05-06T15:40:00Z",
      source: "supply-chain-feed · trade press",
      status: "thesis_open",
      summary:
        "A sustained feedstock-cost dislocation has made a non-core Gulf complex a divestiture candidate — a carve-out a structural buyer can reposition.",
      tags: ["materials", "petrochemical", "Gulf-Coast", "carve-out"],
      confidence: 0.84,
      location: { lon: -90.0715, lat: 29.9511, region: "Gulf Coast, LA" },
    }),
  },
  {
    geoId: "great-lakes-mi",
    subject: "Auto-supplier tier-1",
    scale: "$140M control position",
    thesisFit: 90,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Market-structure — EV transition strands an ICE supplier" },
      { kind: "sector", label: "Industrials — core thesis sector" },
      { kind: "geo", label: "Great Lakes — within the coverage geography" },
      { kind: "scale", label: "Fits the control-equity range" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111104",
      kind: "market_structure",
      severity: "high",
      headline: "EV transition strands a Great Lakes ICE-powertrain tier-1 supplier",
      occurred_at: "2026-04-29T13:15:00Z",
      ingested_at: "2026-04-29T17:00:00Z",
      source: "market-structure-feed · analyst",
      status: "triaged",
      summary:
        "An ICE-powertrain tier-1 faces a structural demand cliff as OEM programs sunset — a control opening to reposition the asset's tooling base.",
      tags: ["industrials", "automotive", "Michigan", "EV-transition"],
      confidence: 0.8,
      location: { lon: -83.0458, lat: 42.3314, region: "Detroit, MI" },
    }),
  },
  {
    geoId: "northeast-ny",
    subject: "Regional utility holding co.",
    scale: "$70M structured minority",
    thesisFit: 73,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Leadership — new CEO signals a structural reset" },
      { kind: "sector", label: "Energy infrastructure — core thesis sector" },
      { kind: "scale", label: "Within the structured-minority range" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111105",
      kind: "leadership",
      severity: "medium",
      headline: "Northeast utility holding company installs a turnaround chief executive",
      occurred_at: "2026-05-02T08:00:00Z",
      ingested_at: "2026-05-02T10:30:00Z",
      source: "leadership-feed · filings",
      status: "ingested",
      summary:
        "A new chief executive with a restructuring mandate signals a structural reset at a regional utility holding company — an early-stage origination signal.",
      tags: ["energy", "utility", "New-York", "leadership-change"],
      confidence: 0.55,
      location: { lon: -73.9712, lat: 40.7831, region: "New York, NY" },
    }),
  },
  {
    geoId: "southeast-ga",
    subject: "Port logistics operator",
    scale: "$95M growth equity",
    thesisFit: 79,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Supply-chain — nearshoring reroutes container volume" },
      { kind: "sector", label: "Industrials — core thesis sector" },
      { kind: "scale", label: "Within the check range" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111106",
      kind: "supply_chain",
      severity: "medium",
      headline: "Nearshoring reroutes container volume toward a Southeast port operator",
      occurred_at: "2026-04-24T10:45:00Z",
      ingested_at: "2026-04-24T14:10:00Z",
      source: "supply-chain-feed · port data",
      status: "triaged",
      summary:
        "A sustained nearshoring shift is concentrating container volume at a Southeast port — a growth-equity opening for the logistics operator that handles it.",
      tags: ["industrials", "logistics", "Georgia", "nearshoring"],
      confidence: 0.68,
      location: { lon: -81.0912, lat: 32.0809, region: "Savannah, GA" },
    }),
  },
  {
    geoId: "mountain-co",
    subject: "Critical-minerals processor",
    scale: "$210M control position",
    thesisFit: 94,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Regulatory — domestic-content rule lifts a processor" },
      { kind: "sector", label: "Materials — core thesis sector" },
      { kind: "geo", label: "Mountain West — within the coverage geography" },
      { kind: "scale", label: "Fits the $40M–$120M control-equity range" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111107",
      kind: "regulatory",
      severity: "critical",
      headline: "Domestic-content rule resets the economics of a Mountain West minerals processor",
      occurred_at: "2026-05-14T15:30:00Z",
      ingested_at: "2026-05-14T18:00:00Z",
      source: "regulatory-feed · agency rule",
      status: "thesis_open",
      summary:
        "A domestic-content procurement rule structurally advantages a US critical-minerals processor — a control opening ahead of a demand step-change.",
      tags: ["materials", "critical-minerals", "Colorado", "domestic-content"],
      confidence: 0.88,
      location: { lon: -104.9903, lat: 39.7392, region: "Denver, CO" },
    }),
  },
  {
    geoId: "pnw-wa",
    subject: "Hydropower-adjacent operator",
    scale: "$60M structured minority",
    thesisFit: 70,
    thesisReasons: [
      { kind: "catalyst-kind", label: "Litigation — water-rights ruling reshapes the asset" },
      { kind: "sector", label: "Energy infrastructure — core thesis sector" },
      { kind: "geo", label: "Pacific Northwest — adjacent to coverage" },
    ],
    event: catalystEventSchema.parse({
      id: "11111111-1111-1111-1111-111111111108",
      kind: "litigation",
      severity: "medium",
      headline: "Water-rights ruling reshapes a Pacific Northwest hydropower-adjacent operator",
      occurred_at: "2026-04-19T12:00:00Z",
      ingested_at: "2026-04-19T16:30:00Z",
      source: "litigation-feed · docket",
      status: "ingested",
      summary:
        "A water-rights ruling alters the operating envelope of a hydropower-adjacent asset — an early structural signal worth tracking into a thesis.",
      tags: ["energy", "hydropower", "Washington", "water-rights"],
      confidence: 0.5,
      location: { lon: -120.7401, lat: 47.7511, region: "Columbia Basin, WA" },
    }),
  },
];

/** The plotted catalysts — schema-validated, joined to geometry by id. */
export const DEMO_CATALYSTS: DemoCatalyst[] = CATALYST_SEEDS.map((seed) => ({
  geoId: seed.geoId,
  event: seed.event,
  subject: seed.subject,
  scale: seed.scale,
  thesisFit: seed.thesisFit,
  thesisReasons: seed.thesisReasons,
}));

/** Just the validated `CatalystEvent` records — the contract-conforming layer. */
export const CATALYST_EVENTS: CatalystEvent[] = DEMO_CATALYSTS.map((c) => c.event);

/** Look up a plotted catalyst by its geometry id. */
export function catalystByGeoId(geoId: string): DemoCatalyst | undefined {
  return DEMO_CATALYSTS.find((c) => c.geoId === geoId);
}

/** Geometry point + its catalyst payload, zipped — what the map renders. */
export type PlottedCatalyst = {
  point: GeoCatalystPoint;
  catalyst: DemoCatalyst;
};

export const PLOTTED_CATALYSTS: PlottedCatalyst[] = GEO_CATALYST_POINTS.flatMap((point) => {
  const catalyst = catalystByGeoId(point.id);
  return catalyst ? [{ point, catalyst }] : [];
});

// ───────────────────────────────────────────────────────────────────
// The thesis-matched set — what the Match phase ranks. The demo sorts
// the plotted catalysts by thesis fit; the top set is "this week's
// matched catalysts" routed to the partner.
// ───────────────────────────────────────────────────────────────────

export const MATCHED_CATALYSTS: DemoCatalyst[] = [...DEMO_CATALYSTS].sort(
  (a, b) => b.thesisFit - a.thesisFit,
);
