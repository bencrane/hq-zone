import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

import type { MetricFormat, MetricGridPayload } from "../../../lib/agentRuns";

function formatValue(v: number | string, fmt: MetricFormat): string {
  if (typeof v === "string") return v;
  switch (fmt) {
    case "int":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
    case "decimal":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
    case "percent":
      return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(
        v,
      );
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(v);
  }
}

export function MetricGridCard({ payload, title }: { payload: MetricGridPayload; title?: string }) {
  const tiles = payload.tiles ?? [];
  return (
    <Card variant="surface">
      {title ? (
        <Heading size="3" mb="2">
          {title}
        </Heading>
      ) : null}
      <Flex gap="2" wrap="wrap">
        {tiles.map((t, i) => {
          const deltaSign =
            t.delta !== undefined ? (t.delta > 0 ? "+" : t.delta < 0 ? "" : "") : "";
          const deltaColor =
            t.delta !== undefined && t.delta > 0
              ? "grass"
              : t.delta !== undefined && t.delta < 0
                ? "tomato"
                : "gray";
          return (
            <Box
              // biome-ignore lint/suspicious/noArrayIndexKey: static render-once agent-payload tiles with no stable per-item id; never reordered, so the array index is a safe key.
              key={i}
              p="3"
              style={{
                flex: "1 1 140px",
                minWidth: 140,
                border: "1px solid var(--gray-a4)",
                borderRadius: 6,
                background: "var(--color-panel-solid)",
              }}
            >
              <Text as="div" size="1" color="gray">
                {t.label}
              </Text>
              <Text as="div" size="6" weight="bold" mt="1">
                {formatValue(t.value, t.format)}
              </Text>
              {t.delta !== undefined ? (
                <Text as="div" size="1" color={deltaColor} mt="1">
                  {deltaSign}
                  {formatValue(
                    t.delta,
                    t.format === "currency" || t.format === "percent" ? t.format : "decimal",
                  )}
                  {t.delta_label ? ` ${t.delta_label}` : ""}
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Flex>
    </Card>
  );
}
