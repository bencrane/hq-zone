/**
 * ResultsRail — the RIGHT lane: structured outputs. Collects every
 * `agent.custom_tool_use` named present_result from the event stream and
 * renders the matching typed card. This split (results out of the chat
 * column, into a persistent panel) is what makes the surface read as a
 * workspace rather than a ChatGPT transcript.
 */
import { Callout, Card, Code, Flex, Text } from "@radix-ui/themes";

import type { AgentCustomToolUseEvent, AgentRunEvent, PresentResultInput } from "@/lib/agentRuns";
import { PRESENT_RESULT_TOOL_NAME, asResultPayload } from "@/lib/agentRuns";
import { DataTableCard } from "@/signals/agent_timeline/cards/DataTableCard";
import { MetricGridCard } from "@/signals/agent_timeline/cards/MetricGridCard";
import { NarrativeSummaryCard } from "@/signals/agent_timeline/cards/NarrativeSummaryCard";
import { RankedListCard } from "@/signals/agent_timeline/cards/RankedListCard";
import { RecommendationCard } from "@/signals/agent_timeline/cards/RecommendationCard";
import { SchemaCard } from "@/signals/agent_timeline/cards/SchemaCard";

function ResultCard({ ev }: { ev: AgentCustomToolUseEvent }) {
  const input = ev.input as PresentResultInput;
  if (!input || typeof input !== "object" || !input.result_type) {
    return (
      <Callout.Root color="amber" size="1">
        <Callout.Text>
          present_result with no result_type: <Code>{JSON.stringify(ev.input).slice(0, 200)}</Code>
        </Callout.Text>
      </Callout.Root>
    );
  }
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const title = input.title;

  switch (input.result_type) {
    case "data_table": {
      const p = asResultPayload("data_table", payload);
      return p ? <DataTableCard payload={p} title={title} /> : null;
    }
    case "ranked_list": {
      const p = asResultPayload("ranked_list", payload);
      return p ? <RankedListCard payload={p} title={title} /> : null;
    }
    case "metric_grid": {
      const p = asResultPayload("metric_grid", payload);
      return p ? <MetricGridCard payload={p} title={title} /> : null;
    }
    case "recommendation_card": {
      const p = asResultPayload("recommendation_card", payload);
      return p ? <RecommendationCard payload={p} title={title} /> : null;
    }
    case "narrative_summary": {
      const p = asResultPayload("narrative_summary", payload);
      return p ? <NarrativeSummaryCard payload={p} title={title} /> : null;
    }
    case "schema_card": {
      const p = asResultPayload("schema_card", payload);
      return p ? <SchemaCard payload={p} title={title} /> : null;
    }
    default:
      return (
        <Card variant="surface">
          <Callout.Root color="amber" size="1">
            <Callout.Text>
              Unknown result_type: <Code>{input.result_type}</Code>
            </Callout.Text>
          </Callout.Root>
        </Card>
      );
  }
}

export function ResultsRail({ events }: { events: AgentRunEvent[] }) {
  const results = events.filter(
    (e): e is AgentCustomToolUseEvent =>
      e.type === "agent.custom_tool_use" &&
      (e as AgentCustomToolUseEvent).name === PRESENT_RESULT_TOOL_NAME,
  );

  if (results.length === 0) {
    return (
      <Flex align="center" justify="center" height="100%" p="6">
        <Text size="2" color="gray" align="center">
          Structured results — tables, rankings, metrics, recommendations — appear here as the agent
          produces them.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3" p="4">
      {results.map((ev, i) => (
        <ResultCard key={`${ev.id ?? "result"}-${i}`} ev={ev} />
      ))}
    </Flex>
  );
}
