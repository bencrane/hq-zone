import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

import type { RecommendationCardPayload } from "../../../lib/agentRuns";

const CONFIDENCE_COLORS = {
  low: "tomato",
  medium: "amber",
  high: "grass",
} as const;

export function RecommendationCard({ payload, title }: { payload: RecommendationCardPayload; title?: string }) {
  return (
    <Card variant="surface">
      <Flex align="center" justify="between" mb="2">
        <Heading size="3">{title ?? "Recommendation"}</Heading>
        <Badge color={CONFIDENCE_COLORS[payload.confidence]} variant="solid">
          {payload.confidence} confidence
        </Badge>
      </Flex>

      <Box mb="3">
        <Text as="div" size="1" color="gray">Decision</Text>
        <Text as="div" size="4" weight="bold">{payload.decision}</Text>
      </Box>

      <Box mb="3">
        <Text as="div" size="1" color="gray">Rationale</Text>
        <Text as="div" size="2">{payload.rationale}</Text>
      </Box>

      {payload.inputs_used.length > 0 ? (
        <Box mb="3">
          <Text as="div" size="1" color="gray" mb="1">Inputs used</Text>
          <Flex gap="1" wrap="wrap">
            {payload.inputs_used.map((s, i) => (
              <Badge key={i} variant="soft" color="gray">{s}</Badge>
            ))}
          </Flex>
        </Box>
      ) : null}

      {payload.next_actions && payload.next_actions.length > 0 ? (
        <Box>
          <Text as="div" size="1" color="gray" mb="1">Next actions</Text>
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {payload.next_actions.map((s, i) => (
              <li key={i}><Text size="2">{s}</Text></li>
            ))}
          </ol>
        </Box>
      ) : null}
    </Card>
  );
}
