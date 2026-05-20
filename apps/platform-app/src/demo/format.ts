/**
 * Display formatters for the catalyst map demo. Kept local to `src/demo/**`.
 */

import type { CatalystSeverity } from "@rare-structure-hq/shared";

/** ISO timestamp → "May 12, 2026". */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO timestamp → "May 12" (compact, no year). */
export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Thesis-fit score (0–100) → display tier for pill styling. */
export function fitTier(score: number): "high" | "mid" | "low" {
  return score >= 90 ? "high" : score >= 75 ? "mid" : "low";
}

/** Catalyst severity → the badge tone token name. */
export function severityTone(severity: CatalystSeverity): "error" | "warn" | "info" | "default" {
  switch (severity) {
    case "critical":
      return "error";
    case "high":
      return "warn";
    case "medium":
      return "info";
    default:
      return "default";
  }
}

/** Catalyst kind enum → a human label. */
export function kindLabel(kind: string): string {
  switch (kind) {
    case "regulatory":
      return "Regulatory";
    case "financing":
      return "Financing";
    case "leadership":
      return "Leadership";
    case "supply_chain":
      return "Supply chain";
    case "litigation":
      return "Litigation";
    case "market_structure":
      return "Market structure";
    default:
      return "Other";
  }
}
