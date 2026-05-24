/**
 * Datasets section — Pattern A Lance source datasets. Each row shows
 * the dataset name, current row count, and last Lance version timestamp.
 */
import { Stack, Text } from "@rare-structure-hq/ui";

import type { CoverageStatRow } from "@/lib/api";

function formatCount(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

function formatTs(value: string | undefined | null): string {
  if (!value) return "—";
  return value;
}

export function DatasetsSection({ rows }: { rows: CoverageStatRow[] }) {
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Text as="h2" size="display-xs">
          Datasets
        </Text>
        <Text size="body-sm" color="muted">
          Lance source datasets in R2 — refreshed by data-factory ingest jobs.
        </Text>
      </Stack>
      {rows.length === 0 ? (
        <Text size="body-sm" color="muted">
          No coverage stats yet — nightly cron next at 08:00 UTC.
        </Text>
      ) : (
        <Stack gap="2">
          {rows.map((row) => {
            const rowCount = row.payload.row_count;
            const lastTs = row.payload.last_version_ts ?? row.captured_at;
            const err = row.payload.error;
            return (
              <Stack key={row.metric_name} gap="1">
                <Text size="body-sm" mono>
                  <span>{row.metric_name}</span>
                  <span className="text-[color:var(--color-text-muted)]">
                    {" — "}
                    {formatCount(rowCount)} rows
                  </span>
                </Text>
                <Text size="body-xs" color="muted">
                  last version: {formatTs(lastTs)}
                  {err ? ` · error: ${err}` : ""}
                </Text>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
