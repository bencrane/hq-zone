/**
 * Intersections section — YAML-declared predicate chains over Lance
 * datasets and bridges. Each row shows the intersection name, its
 * count + match rate, and the `predicate_chain` text below the count
 * (hard constraint #1) so the operator can read the join semantics
 * inline.
 */
import { Stack, Text } from "@rare-structure-hq/ui";

import type { CoverageStatRow } from "@/lib/api";

function formatCount(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function IntersectionsSection({ rows }: { rows: CoverageStatRow[] }) {
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Text as="h2" size="display-xs">
          Intersections
        </Text>
        <Text size="body-sm" color="muted">
          Predicate-chain rollups over bridges — each row carries its predicate_chain.
        </Text>
      </Stack>
      {rows.length === 0 ? (
        <Text size="body-sm" color="muted">
          No coverage stats yet — nightly cron next at 08:00 UTC.
        </Text>
      ) : (
        <Stack gap="3">
          {rows.map((row) => {
            const count = row.payload.count ?? row.payload.row_count;
            const rate = row.payload.match_rate;
            const predicateChain = row.payload.predicate_chain;
            const err = row.payload.error;
            return (
              <Stack key={row.metric_name} gap="1">
                <Text size="body-sm" mono>
                  <span>{row.metric_name}</span>
                  <span className="text-[color:var(--color-text-muted)]">
                    {" — "}
                    {formatCount(count)} rows · match rate {formatRate(rate)}
                  </span>
                </Text>
                {predicateChain ? (
                  <Text size="body-xs" color="muted">
                    predicate_chain: {predicateChain}
                  </Text>
                ) : null}
                {err ? (
                  <Text size="body-xs" color="muted">
                    error: {err}
                  </Text>
                ) : null}
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
