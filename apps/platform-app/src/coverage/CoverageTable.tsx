/**
 * CoverageTable — data-factory inventory rendered with Radix Themes Table.
 *
 * Renders the union of stats.datasets, stats.bridges, and stats.intersections
 * as one Radix Table. Backed by ops.coverage_stats via DEX GET /coverage/stats
 * — no live Lance scans on render.
 */
import { Badge, Box, Callout, Code, Flex, Table, Text, TextField } from "@radix-ui/themes";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

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

// ─── Filter system ────────────────────────────────────────────────────────────
// Extensible registry: add a new bucket by appending one FilterDef to FILTERS.
// `kind: "text"` renders a substring search (case-insensitive). `kind:
// "multi-enum"` renders toggleable Badge chips, empty selection = "match all".
// Each predicate runs against the per-row value returned by `extract`.

type TextFilterDef<T> = {
  key: string;
  label: string;
  kind: "text";
  placeholder?: string;
  extract: (row: T) => string;
};

type MultiEnumFilterDef<T> = {
  key: string;
  label: string;
  kind: "multi-enum";
  options: readonly string[];
  optionColor?: (option: string) => React.ComponentProps<typeof Badge>["color"];
  extract: (row: T) => string;
};

type FilterDef<T> = TextFilterDef<T> | MultiEnumFilterDef<T>;
type FilterValue = string | ReadonlySet<string>;
type FilterState = Record<string, FilterValue>;

const FILTERS: readonly FilterDef<FlatRow>[] = [
  {
    key: "name",
    label: "Name",
    kind: "text",
    placeholder: "Filter by name…",
    extract: (row) => cleanName(row.metric_name),
  },
  {
    key: "type",
    label: "Type",
    kind: "multi-enum",
    options: ["Dataset", "Bridge", "Intersection"] as const,
    optionColor: (opt) => TYPE_COLORS[opt as RowKind],
    extract: (row) => deriveType(row.metric_name, row.scope),
  },
];

function passesFilter<T>(row: T, def: FilterDef<T>, value: FilterValue | undefined): boolean {
  if (def.kind === "text") {
    const v = ((value as string | undefined) ?? "").trim().toLowerCase();
    if (!v) return true;
    return def.extract(row).toLowerCase().includes(v);
  }
  const set = (value as ReadonlySet<string> | undefined) ?? new Set<string>();
  if (set.size === 0) return true;
  return set.has(def.extract(row));
}

function passesAllFilters<T>(row: T, defs: readonly FilterDef<T>[], state: FilterState): boolean {
  for (const def of defs) {
    if (!passesFilter(row, def, state[def.key])) return false;
  }
  return true;
}

function initialFilterState<T>(defs: readonly FilterDef<T>[]): FilterState {
  const out: FilterState = {};
  for (const def of defs) {
    out[def.key] = def.kind === "text" ? "" : new Set<string>();
  }
  return out;
}

function hasActiveFilters<T>(defs: readonly FilterDef<T>[], state: FilterState): boolean {
  for (const def of defs) {
    const v = state[def.key];
    if (def.kind === "text") {
      if (typeof v === "string" && v.trim().length > 0) return true;
    } else if (v instanceof Set && v.size > 0) {
      return true;
    }
  }
  return false;
}

function FilterToolbar({
  defs,
  state,
  onChange,
  onReset,
  active,
}: {
  defs: readonly FilterDef<FlatRow>[];
  state: FilterState;
  onChange: (key: string, value: FilterValue) => void;
  onReset: () => void;
  active: boolean;
}) {
  return (
    <Flex gap="4" align="center" wrap="wrap" mb="3">
      {defs.map((def) => {
        if (def.kind === "text") {
          const v = (state[def.key] as string) ?? "";
          return (
            <Box key={def.key} style={{ minWidth: 260, flex: "0 1 320px" }}>
              <TextField.Root
                size="2"
                placeholder={def.placeholder ?? def.label}
                value={v}
                onChange={(e) => onChange(def.key, e.target.value)}
              >
                <TextField.Slot>
                  <Search size={14} />
                </TextField.Slot>
                {v ? (
                  <TextField.Slot>
                    <X
                      size={14}
                      style={{ cursor: "pointer" }}
                      onClick={() => onChange(def.key, "")}
                    />
                  </TextField.Slot>
                ) : null}
              </TextField.Root>
            </Box>
          );
        }
        const selected = (state[def.key] as ReadonlySet<string>) ?? new Set<string>();
        return (
          <Flex key={def.key} gap="2" align="center" wrap="wrap">
            <Text size="1" color="gray" weight="medium" style={{ textTransform: "uppercase" }}>
              {def.label}
            </Text>
            {def.options.map((opt) => {
              const isActive = selected.has(opt);
              return (
                <Badge
                  key={opt}
                  color={def.optionColor?.(opt) ?? "gray"}
                  variant={isActive ? "solid" : "soft"}
                  radius="full"
                  style={{
                    cursor: "pointer",
                    opacity: isActive || selected.size === 0 ? 1 : 0.45,
                    userSelect: "none",
                  }}
                  onClick={() => {
                    const next = new Set(selected);
                    if (isActive) next.delete(opt);
                    else next.add(opt);
                    onChange(def.key, next);
                  }}
                >
                  {opt}
                </Badge>
              );
            })}
          </Flex>
        );
      })}
      {active ? (
        <Text
          size="1"
          color="gray"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={onReset}
        >
          Clear filters
        </Text>
      ) : null}
    </Flex>
  );
}

export function CoverageTable({ stats }: { stats: CoverageStats }) {
  const allRows = useMemo(() => flatten(stats), [stats]);
  const [filterState, setFilterState] = useState<FilterState>(() => initialFilterState(FILTERS));

  const filteredRows = useMemo(
    () => allRows.filter((row) => passesAllFilters(row, FILTERS, filterState)),
    [allRows, filterState],
  );

  const filtersActive = hasActiveFilters(FILTERS, filterState);

  if (allRows.length === 0) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>No coverage stats yet — nightly cron next at 08:00 UTC.</Callout.Text>
      </Callout.Root>
    );
  }

  const counts = filteredRows.reduce(
    (acc, r) => {
      const t = deriveType(r.metric_name, r.scope);
      acc[t] += 1;
      return acc;
    },
    { Dataset: 0, Bridge: 0, Intersection: 0 } as Record<RowKind, number>,
  );

  const updateFilter = (key: string, value: FilterValue) => {
    setFilterState((prev) => ({ ...prev, [key]: value }));
  };
  const resetFilters = () => setFilterState(initialFilterState(FILTERS));

  return (
    <Box>
      <FilterToolbar
        defs={FILTERS}
        state={filterState}
        onChange={updateFilter}
        onReset={resetFilters}
        active={filtersActive}
      />
      <Box mb="3">
        <Text size="2" color="gray">
          {filteredRows.length.toLocaleString()}
          {filtersActive ? ` of ${allRows.length.toLocaleString()}` : ""} entries —{" "}
          {counts.Dataset.toLocaleString()} datasets · {counts.Bridge.toLocaleString()} bridges
          {counts.Intersection > 0
            ? ` · ${counts.Intersection.toLocaleString()} intersections`
            : ""}
        </Text>
      </Box>
      {filteredRows.length === 0 ? (
        <Callout.Root color="gray" variant="surface">
          <Callout.Text>No entries match the current filters.</Callout.Text>
        </Callout.Root>
      ) : (
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
            {filteredRows.map((row) => {
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
      )}
    </Box>
  );
}
