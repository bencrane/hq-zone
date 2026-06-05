import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

import type { NarrativeSummaryPayload } from "../../../lib/agentRuns";

const CONFIDENCE_COLORS = {
  low: "tomato",
  medium: "amber",
  high: "grass",
} as const;

export function NarrativeSummaryCard({
  payload,
  title,
}: { payload: NarrativeSummaryPayload; title?: string }) {
  return (
    <Card variant="surface">
      <Flex align="center" justify="between" mb="2">
        <Heading size="3">{title ?? "Summary"}</Heading>
        {payload.confidence ? (
          <Badge color={CONFIDENCE_COLORS[payload.confidence]} variant="soft">
            {payload.confidence}
          </Badge>
        ) : null}
      </Flex>

      <Text as="div" size="2" mb="3">
        {payload.summary}
      </Text>

      {payload.key_points.length > 0 ? (
        <Box>
          <Text as="div" size="1" color="gray" mb="1">
            Key points
          </Text>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {payload.key_points.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static render-once agent-payload list with no stable per-item id; never reordered, so the array index is a safe key.
              <li key={i}>
                <Text size="2">{p}</Text>
              </li>
            ))}
          </ul>
        </Box>
      ) : null}
    </Card>
  );
}
