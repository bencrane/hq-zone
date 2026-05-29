import { Badge, Box, Card, Heading, Table, Text } from "@radix-ui/themes";

import type { DataTableColumnType, DataTablePayload } from "../../../lib/agentRuns";

function formatCell(v: unknown, t: DataTableColumnType): string {
  if (v === null || v === undefined) return "—";
  if (t === "boolean") return v ? "true" : "false";
  if (t === "currency" && typeof v === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  }
  if (t === "number" && typeof v === "number") {
    return new Intl.NumberFormat("en-US").format(v);
  }
  if (t === "date") {
    const s = String(v);
    return s.length > 10 ? s.slice(0, 10) : s;
  }
  return String(v);
}

export function DataTableCard({ payload, title }: { payload: DataTablePayload; title?: string }) {
  const rows = payload.rows ?? [];
  const cols = payload.columns ?? [];
  return (
    <Card variant="surface">
      <Box mb="2">
        <Heading size="3">{title ?? "Table"}</Heading>
        <Text as="div" size="1" color="gray">
          {rows.length} rows{payload.total_rows !== undefined && payload.total_rows > rows.length
            ? ` (of ${payload.total_rows})`
            : ""}
          {payload.source ? ` · source: ${payload.source}` : ""}
        </Text>
      </Box>
      <Box style={{ overflowX: "auto" }}>
        <Table.Root size="1" variant="surface">
          <Table.Header>
            <Table.Row>
              {cols.map((c) => (
                <Table.ColumnHeaderCell key={c.key}>
                  {c.label}
                  <Badge ml="1" size="1" color="gray" variant="soft">{c.type}</Badge>
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r, i) => (
              <Table.Row key={i}>
                {cols.map((c) => (
                  <Table.Cell key={c.key}>{formatCell(r[c.key], c.type)}</Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Card>
  );
}
