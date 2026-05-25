/**
 * CoverageTable — data-factory inventory rendered with Radix Themes Table.
 *
 * Renders the union of stats.datasets, stats.bridges, and stats.intersections
 * as one Radix Table. Backed by ops.coverage_stats via DEX GET /coverage/stats
 * — no live Lance scans on render.
 */
import { Badge, Box, Callout, Code, Table, Text } from "@radix-ui/themes";

import type { CoverageStatPayload, CoverageStatRow, CoverageStats } from "@/lib/api";

type Scope = "dataset" | "bridge" | "intersection";

interface FlatRow {
  metric_name: string;
  captured_at: string | null;
  payload: CoverageStatPayload;
  scope: Scope;
}

const TS_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
});

function cleanName(metricName: string): string {
  return metricName.replace(/_lance$/i, "");
}

type RowKind = "Bridge" | "Dataset" | "Intersection";

function deriveType(metricName: string, scope: Scope): RowKind {
  if (/^bridges?_/i.test(metricName) || scope === "bridge") return "Bridge";
  if (scope === "intersection") return "Intersection";
  return "Dataset";
}

const TYPE_COLORS: Record<RowKind, React.ComponentProps<typeof Badge>["color"]> = {
  Dataset: "blue",
  Bridge: "violet",
  Intersection: "amber",
};

function deriveRowCount(payload: CoverageStatPayload): number | undefined {
  return payload.row_count ?? payload.distinct_keys_matched ?? payload.count;
}

function formatRowCount(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

function formatTs(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${TS_FORMAT.format(d)} UTC`;
}

function freshnessColor(
  iso: string | null | undefined,
): React.ComponentProps<typeof Badge>["color"] {
  if (!iso) return "gray";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "gray";
  const ageHours = (Date.now() - d.getTime()) / 36e5;
  if (ageHours < 36) return "green";
  if (ageHours < 96) return "yellow";
  return "red";
}

function flatten(stats: CoverageStats): FlatRow[] {
  return [
    ...stats.datasets.map((r): FlatRow => ({ ...r, scope: "dataset" })),
    ...stats.bridges.map((r): FlatRow => ({ ...r, scope: "bridge" })),
    ...stats.intersections.map((r): FlatRow => ({ ...r, scope: "intersection" })),
  ];
}

export function CoverageTable({ stats }: { stats: CoverageStats }) {
  const rows = flatten(stats);

  if (rows.length === 0) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>No coverage stats yet — nightly cron next at 08:00 UTC.</Callout.Text>
      </Callout.Root>
    );
  }

  const counts = rows.reduce(
    (acc, r) => {
      const t = deriveType(r.metric_name, r.scope);
      acc[t] += 1;
      return acc;
    },
    { Dataset: 0, Bridge: 0, Intersection: 0 } as Record<RowKind, number>,
  );

  return (
    <Box>
      <Box mb="3">
        <Text size="2" color="gray">
          {rows.length.toLocaleString()} entries — {counts.Dataset.toLocaleString()} datasets ·{" "}
          {counts.Bridge.toLocaleString()} bridges
          {counts.Intersection > 0
            ? ` · ${counts.Intersection.toLocaleString()} intersections`
            : ""}
        </Text>
      </Box>
      <Table.Root variant="surface" size="2">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell width="40%">Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="15%">Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="15%" justify="end">
              Row Count
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="30%">Last Updated</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => {
            const type = deriveType(row.metric_name, row.scope);
            const lastTs = row.payload.last_version_ts ?? row.captured_at;
            const err = typeof row.payload.error === "string" ? row.payload.error : null;
            return (
              <Table.Row key={`${row.scope}-${row.metric_name}`} align="center">
                <Table.RowHeaderCell>
                  <Code variant="ghost" size="2">
                    {cleanName(row.metric_name)}
                  </Code>
                  {err ? (
                    <Text as="div" size="1" color="red" mt="1">
                      error: {err}
                    </Text>
                  ) : null}
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Badge color={TYPE_COLORS[type]} variant="soft" radius="full">
                    {type}
                  </Badge>
                </Table.Cell>
                <Table.Cell justify="end">
                  <Text size="2">{formatRowCount(deriveRowCount(row.payload))}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={freshnessColor(lastTs)} variant="soft" radius="full">
                    {formatTs(lastTs)}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
