/**
 * Bridges section — Pattern B identity / domain bridges across Lance
 * datasets. Each row renders the bridge name, its distinct-keys count
 * (with `match_method` adjacent — hard constraint #1), and the tier
 * breakdown (platinum / gold / silver / rejected) when emitted.
 */
import { Stack, Text } from "@rare-structure-hq/ui";

import type { CoverageStatRow } from "@/lib/api";

function formatCount(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

function renderTierBreakdown(tiers: Record<string, number> | undefined) {
  if (!tiers || Object.keys(tiers).length === 0) return null;
  const parts = Object.entries(tiers).map(
    ([tier, count]) => `${tier}: ${count.toLocaleString()}`,
  );
  return (
    <Text size="body-xs" color="muted">
      tiers — {parts.join(" · ")}
    </Text>
  );
}

export function BridgesSection({ rows }: { rows: CoverageStatRow[] }) {
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Text as="h2" size="display-xs">
          Bridges
        </Text>
        <Text size="body-sm" color="muted">
          Identity bridges across datasets — every row shows its match_method.
        </Text>
      </Stack>
      {rows.length === 0 ? (
        <Text size="body-sm" color="muted">
          No coverage stats yet — nightly cron next at 08:00 UTC.
        </Text>
      ) : (
        <Stack gap="2">
          {rows.map((row) => {
            const count =
              row.payload.distinct_keys_matched ?? row.payload.row_count ?? row.payload.count;
            const matchMethod = row.payload.match_method;
            const err = row.payload.error;
            return (
              <Stack key={row.metric_name} gap="1">
                <Text size="body-sm" mono>
                  <span>{row.metric_name}</span>
                  <span className="text-[color:var(--color-text-muted)]">
                    {" — "}
                    {formatCount(count)} matched
                    {matchMethod ? ` via match_method=${matchMethod}` : ""}
                  </span>
                </Text>
                {renderTierBreakdown(row.payload.tier_breakdown)}
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
