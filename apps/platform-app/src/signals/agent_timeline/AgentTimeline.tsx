/**
 * <AgentTimeline> — the right-lane renderer for an in-flight gtm-agent run.
 *
 * Per the locked layout: USER input lives on the left; EVERYTHING the
 * agent emits is rendered here in arrival order. The switch-renderer is
 * exhaustive on the types we care about and silently drops the rest
 * (span.*, session.thread_*, user.message echoes, user.custom_tool_result
 * auto-ack receipts).
 *
 * Result-card dispatch: `agent.custom_tool_use` with name="present_result"
 * switches on `input.result_type` to the matching typed component. Other
 * custom tools render as generic tool chips. Stage 1.5 auto-acks
 * present_result upstream, so the timeline does NOT need to send
 * user.custom_tool_result for these.
 */
import { Badge, Box, Callout, Card, Code, Flex, Text } from "@radix-ui/themes";
import { useState, type ReactElement } from "react";

import type {
  AgentRunEvent,
  AgentMcpToolUseEvent,
  AgentMessageEvent,
  AgentThinkingEvent,
  AgentToolUseEvent,
  AgentCustomToolUseEvent,
  PresentResultInput,
  SessionErrorEvent,
  SessionStatusEvent,
  TextBlock,
  ThinkingBlock,
} from "../../lib/agentRuns";
import { PRESENT_RESULT_TOOL_NAME, asResultPayload } from "../../lib/agentRuns";

import { DataTableCard } from "./cards/DataTableCard";
import { MetricGridCard } from "./cards/MetricGridCard";
import { NarrativeSummaryCard } from "./cards/NarrativeSummaryCard";
import { RankedListCard } from "./cards/RankedListCard";
import { RecommendationCard } from "./cards/RecommendationCard";
import { SchemaCard } from "./cards/SchemaCard";

// ───────────────────────────────────────────────────────────────────────────
// Type guards
// ───────────────────────────────────────────────────────────────────────────

function isTextBlock(b: { type: string }): b is TextBlock {
  return b.type === "text";
}
function isThinkingBlock(b: { type: string }): b is ThinkingBlock {
  return b.type === "thinking";
}

// ───────────────────────────────────────────────────────────────────────────
// Per-event blocks
// ───────────────────────────────────────────────────────────────────────────

function AgentMessageBlock({ ev }: { ev: AgentMessageEvent }) {
  const texts = (ev.content ?? []).filter(isTextBlock).map((b) => b.text).join("");
  if (!texts) return null;
  return (
    <Box my="2" p="3" style={{
      background: "var(--gray-a2)", borderRadius: 6,
      borderLeft: "3px solid var(--indigo-9)",
    }}>
      <Text as="div" size="2" style={{ whiteSpace: "pre-wrap" }}>{texts}</Text>
    </Box>
  );
}

function AgentThinkingBlock({ ev }: { ev: AgentThinkingEvent }) {
  const [open, setOpen] = useState(false);
  const txt =
    ev.thinking ??
    (ev.content ?? []).filter(isThinkingBlock).map((b) => b.thinking).join("") ??
    "";
  if (!txt) return null;
  return (
    <Box my="1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent", border: "none", padding: 0, cursor: "pointer",
          fontFamily: "inherit", fontSize: "11px", color: "var(--gray-11)",
        }}
      >
        {open ? "▼" : "▶"} thinking ({txt.length} chars)
      </button>
      {open ? (
        <Box mt="1" p="2" style={{
          background: "var(--gray-a2)", borderRadius: 4,
          fontFamily: "var(--code-font-family)", fontSize: "11px",
          whiteSpace: "pre-wrap", color: "var(--gray-11)",
        }}>{txt}</Box>
      ) : null}
    </Box>
  );
}

function ToolUseChip({ name, input, kind }: { name: string; input: unknown; kind: "tool" | "mcp" | "custom" }) {
  const [open, setOpen] = useState(false);
  const inputStr = typeof input === "string" ? input : JSON.stringify(input);
  const inputPreview = inputStr.length > 80 ? `${inputStr.slice(0, 80)}…` : inputStr;
  return (
    <Box my="1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 8px", borderRadius: 4,
          background: "var(--gray-a3)", color: "var(--gray-12)",
          border: "1px solid var(--gray-a4)", cursor: "pointer",
          fontFamily: "var(--code-font-family)", fontSize: "11px",
        }}
      >
        🔧 <strong>{kind === "mcp" ? "mcp." : kind === "custom" ? "custom." : ""}{name}</strong>
        <span style={{ color: "var(--gray-10)" }}>({inputPreview})</span>
      </button>
      {open ? (
        <Box mt="1" p="2" style={{
          background: "var(--gray-a2)", borderRadius: 4,
          fontFamily: "var(--code-font-family)", fontSize: "11px",
          whiteSpace: "pre-wrap", color: "var(--gray-12)",
        }}>{inputStr.length > 4000 ? `${inputStr.slice(0, 4000)}…` : inputStr}</Box>
      ) : null}
    </Box>
  );
}

function PresentResultBlock({ ev }: { ev: AgentCustomToolUseEvent }) {
  const input = ev.input as PresentResultInput;
  if (!input || typeof input !== "object" || !input.result_type) {
    return <Callout.Root color="amber" size="1" my="2">
      <Callout.Text>present_result with no result_type — payload: <Code>{JSON.stringify(ev.input).slice(0, 240)}</Code></Callout.Text>
    </Callout.Root>;
  }
  const payload = (input.payload ?? {}) as Record<string, unknown>;
  const title = input.title;

  switch (input.result_type) {
    case "data_table": {
      const p = asResultPayload("data_table", payload);
      return p ? <Box my="2"><DataTableCard payload={p} title={title} /></Box> : null;
    }
    case "ranked_list": {
      const p = asResultPayload("ranked_list", payload);
      return p ? <Box my="2"><RankedListCard payload={p} title={title} /></Box> : null;
    }
    case "metric_grid": {
      const p = asResultPayload("metric_grid", payload);
      return p ? <Box my="2"><MetricGridCard payload={p} title={title} /></Box> : null;
    }
    case "recommendation_card": {
      const p = asResultPayload("recommendation_card", payload);
      return p ? <Box my="2"><RecommendationCard payload={p} title={title} /></Box> : null;
    }
    case "narrative_summary": {
      const p = asResultPayload("narrative_summary", payload);
      return p ? <Box my="2"><NarrativeSummaryCard payload={p} title={title} /></Box> : null;
    }
    case "schema_card": {
      const p = asResultPayload("schema_card", payload);
      return p ? <Box my="2"><SchemaCard payload={p} title={title} /></Box> : null;
    }
    default: {
      // Unknown result_type — fall back to a JSON dump so the operator sees
      // SOMETHING, but flag the version skew.
      return (
        <Card variant="surface" my="2">
          <Callout.Root color="amber" size="1" mb="2">
            <Callout.Text>Unknown result_type: <Code>{input.result_type}</Code> — agent and frontend are out of sync</Callout.Text>
          </Callout.Root>
          <Box style={{ maxHeight: 240, overflow: "auto", fontFamily: "var(--code-font-family)", fontSize: "11px" }}>
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </Box>
        </Card>
      );
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Status pill
// ───────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "gray" | "blue" | "grass" | "amber" | "tomato"> = {
  connecting:                  "gray",
  "session.status_running":     "blue",
  "session.status_idle":        "grass",
  "session.status_rescheduled": "amber",
  "session.status_terminated":  "tomato",
  "session.error":              "tomato",
};

export interface TimelineStatus {
  type:
    | "connecting"
    | "session.status_running"
    | "session.status_idle"
    | "session.status_rescheduled"
    | "session.status_terminated"
    | "session.error";
  detail?: string;
}

function StatusPill({ status }: { status: TimelineStatus | null }) {
  if (!status) return null;
  const color = STATUS_COLORS[status.type] ?? "gray";
  const label = status.type.replace(/^session\./, "");
  return (
    <Flex align="center" gap="2" p="2" style={{
      borderTop: "1px solid var(--gray-a4)", background: "var(--color-panel-translucent)",
    }}>
      <Badge color={color} variant="solid" radius="full">{label}</Badge>
      {status.detail ? <Text size="1" color="gray">{status.detail}</Text> : null}
    </Flex>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Switch-renderer
// ───────────────────────────────────────────────────────────────────────────

function renderEvent(ev: AgentRunEvent, key: string): ReactElement | null {
  switch (ev.type) {
    case "agent.message":
      return <AgentMessageBlock key={key} ev={ev as AgentMessageEvent} />;

    case "agent.thinking":
      return <AgentThinkingBlock key={key} ev={ev as AgentThinkingEvent} />;

    case "agent.tool_use": {
      const e = ev as AgentToolUseEvent;
      return <ToolUseChip key={key} name={e.name} input={e.input} kind="tool" />;
    }

    case "agent.mcp_tool_use": {
      const e = ev as AgentMcpToolUseEvent;
      return <ToolUseChip key={key} name={`${e.server_name ? `${e.server_name}.` : ""}${e.name}`} input={e.input} kind="mcp" />;
    }

    case "agent.custom_tool_use": {
      const e = ev as AgentCustomToolUseEvent;
      if (e.name === PRESENT_RESULT_TOOL_NAME) {
        return <PresentResultBlock key={key} ev={e} />;
      }
      return <ToolUseChip key={key} name={e.name} input={e.input} kind="custom" />;
    }

    // Tool RESULTS are intentionally not rendered as standalone blocks — they
    // attach conceptually to the prior tool_use chip. Surface a minimal
    // confirmation marker so the timeline reflects the round-trip happened.
    case "agent.tool_result":
    case "agent.mcp_tool_result":
      return null;

    // User-domain events: per layout spec, these belong to the LEFT lane.
    // The autoack receipt is also skipped (internal protocol noise).
    case "user.message":
    case "user.custom_tool_result":
      return null;

    // Session status / error: not rendered inline; the StatusPill at the
    // bottom of the timeline reflects the LATEST status.
    case "session.status_running":
    case "session.status_idle":
    case "session.status_rescheduled":
    case "session.status_terminated":
    case "session.error":
      return null;

    default:
      return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Public component
// ───────────────────────────────────────────────────────────────────────────

export interface AgentTimelineProps {
  events: AgentRunEvent[];
  status: TimelineStatus | null;
}

export function AgentTimeline({ events, status }: AgentTimelineProps) {
  // Surface the LATEST session.status_idle / .error inline above the status
  // pill so the operator sees the stop_reason (end_turn vs requires_action
  // vs error message) without scrolling.
  const lastTerminal = [...events].reverse().find(
    (e) =>
      e.type === "session.status_idle" ||
      e.type === "session.status_terminated" ||
      e.type === "session.error",
  ) as SessionStatusEvent | SessionErrorEvent | undefined;

  return (
    <Flex direction="column" height="100%">
      <Box flexGrow="1" p="3" style={{ overflowY: "auto" }}>
        {events.length === 0 ? (
          <Text size="2" color="gray">Waiting for agent…</Text>
        ) : (
          events.map((ev, i) => renderEvent(ev, `${ev.id ?? "i"}-${i}`))
        )}
        {lastTerminal && lastTerminal.type === "session.error" ? (
          <Callout.Root color="tomato" mt="2">
            <Callout.Text>{lastTerminal.error?.message ?? "session error"}</Callout.Text>
          </Callout.Root>
        ) : null}
      </Box>
      <StatusPill status={status} />
    </Flex>
  );
}
