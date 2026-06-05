import { Badge, Box, Card, Code, Heading, Table, Text } from "@radix-ui/themes";

import type { SchemaCardPayload } from "../../../lib/agentRuns";

export function SchemaCard({ payload, title }: { payload: SchemaCardPayload; title?: string }) {
  const cols = payload.columns ?? [];
  return (
    <Card variant="surface">
      <Box mb="2">
        <Heading size="3">{title ?? "Schema"}</Heading>
        <Text as="div" size="1" color="gray">
          {payload.namespace ? `${payload.namespace}.` : ""}
          <Code>{payload.dataset}</Code>
          {typeof payload.row_count === "number"
            ? ` · ${new Intl.NumberFormat("en-US").format(payload.row_count)} rows`
            : ""}
          {cols.length ? ` · ${cols.length} columns` : ""}
        </Text>
        {payload.uri ? (
          <Text as="div" size="1" color="gray" mt="1">
            <Code style={{ wordBreak: "break-all" }}>{payload.uri}</Code>
          </Text>
        ) : null}
      </Box>

      <Box style={{ overflowX: "auto" }}>
        <Table.Root size="1" variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Column</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Nullable</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {cols.map((c) => (
              <Table.Row key={c.name}>
                <Table.Cell>
                  <Code>{c.name}</Code>
                </Table.Cell>
                <Table.Cell>
                  <Code color="gray">{c.type}</Code>
                </Table.Cell>
                <Table.Cell>
                  {c.nullable === undefined ? (
                    <Text size="1" color="gray">
                      —
                    </Text>
                  ) : (
                    <Badge color={c.nullable ? "gray" : "indigo"} variant="soft">
                      {c.nullable ? "nullable" : "NOT NULL"}
                    </Badge>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Card>
  );
}
