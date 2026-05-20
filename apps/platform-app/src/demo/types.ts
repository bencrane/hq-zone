/**
 * Shared types for the catalyst map demo.
 *
 * The demo is an inverted adaptation of the EquipmentWork "Federal Opportunity
 * Terminal." There, federal opportunities were the plotted points and a
 * contractor was the viewer. Here it is flipped: **catalyst events** are the
 * plotted points and the viewer is a **capital partner**. The demo runs the
 * partner through the four-moment story:
 *
 *   map      — the Catalyst Origination Terminal (US map of live catalysts)
 *   filter   — the firehose of catalysts cascades down to a thesis-matched set
 *   match    — split-screen: the partner's thesis + the matched catalysts
 *   deliver  — one catalyst blown up: WHY it fits this partner's thesis
 *
 * The four phase ids below drive `DemoApp`'s orchestrator. `command` is an
 * overlay seam (the ⌘K thesis palette), not a full phase — it floats over
 * `map`. `outro` is a sub-state of `deliver`, so it lives in DemoApp state.
 */

export type DemoPhase = "map" | "filter" | "match" | "deliver";

/**
 * A muted background dot — pure decoration, conveys the catalyst-firehose
 * volume. `band` (0-5, west to east) drives the staggered entrance sweep.
 * Geometry is generated in `us-geo.ts`.
 */
export type ScatterDot = {
  id: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
  band: number;
};
