import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";

import type { RankedListPayload } from "../../../lib/agentRuns";

export function RankedListCard({ payload, title }: { payload: RankedListPayload; title?: string }) {
  const items = [...(payload.items ?? [])].sort((a, b) => a.rank - b.rank);
  return (
    <Card variant="surface">
      <Box mb="2">
        <Heading size="3">{title ?? "Ranking"}</Heading>
        <Text as="div" size="1" color="gray">
          {items.length} items · scoring: {payload.scoring_method}
        </Text>
      </Box>
      <Flex direction="column" gap="2">
        {items.map((it) => {
          const denom = it.score_max && it.score_max > 0 ? it.score_max : 1;
          const pct = Math.max(0, Math.min(100, (it.score / denom) * 100));
          return (
            <Box
              key={`${it.rank}-${it.id}`}
              p="2"
              style={{ borderTop: "1px solid var(--gray-a4)" }}
            >
              <Flex align="center" justify="between" gap="2">
                <Flex align="center" gap="2">
                  <Badge color="indigo" size="2" variant="solid">
                    #{it.rank}
                  </Badge>
                  <Text weight="medium">{it.label}</Text>
                  <Text size="1" color="gray">
                    {it.id}
                  </Text>
                </Flex>
                <Flex align="center" gap="2" style={{ minWidth: 160 }}>
                  <Box
                    style={{
                      flexGrow: 1,
                      height: 6,
                      background: "var(--gray-a3)",
                      borderRadius: 3,
                    }}
                  >
                    <Box
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--indigo-9)",
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                  <Text size="1" weight="medium" style={{ minWidth: 48, textAlign: "right" }}>
                    {it.score.toFixed(2)}
                    {it.score_max ? `/${it.score_max}` : ""}
                  </Text>
                </Flex>
              </Flex>
              <Text as="div" size="2" color="gray" mt="1">
                {it.rationale}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Card>
  );
}
