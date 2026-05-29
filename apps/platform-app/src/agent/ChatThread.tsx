/**
 * ChatThread — the LEFT lane: the conversation. Renders user.message as
 * right-aligned bubbles and everything the agent says (text, collapsible
 * thinking, tool-call chips) on the left. present_result custom-tool calls are
 * NOT rendered here — they go to the right-hand <ResultsRail>. session.* /
 * span.* / tool_result frames are protocol noise and dropped.
 */
import { Box, Flex, Text } from "@radix-ui/themes";
import { type ReactElement, useState } from "react";

import type {
  AgentCustomToolUseEvent,
  AgentMcpToolUseEvent,
  AgentMessageEvent,
  AgentRunEvent,
  AgentThinkingEvent,
  AgentToolUseEvent,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  UserMessageEvent,
} from "@/lib/agentRuns";
import { PRESENT_RESULT_TOOL_NAME } from "@/lib/agentRuns";

function joinText(content: ContentBlock[] | undefined): string {
  return (content ?? [])
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function UserBubble({ ev }: { ev: UserMessageEvent }) {
  const text = joinText(ev.content);
  if (!text) return null;
  return (
    <Flex justify="end" my="2">
      <Box
        px="3"
        py="2"
        style={{
          maxWidth: "78%",
          background: "var(--grass-a4)",
          border: "1px solid var(--grass-a5)",
          borderRadius: "12px 12px 2px 12px",
        }}
      >
        <Text as="div" size="2" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Text>
      </Box>
    </Flex>
  );
}

function AgentMessage({ ev }: { ev: AgentMessageEvent }) {
  const text = joinText(ev.content);
  if (!text) return null;
  return (
    <Flex justify="start" my="2">
      <Box
        px="3"
        py="2"
        style={{
          maxWidth: "85%",
          background: "var(--gray-a3)",
          borderRadius: "12px 12px 12px 2px",
        }}
      >
        <Text as="div" size="2" style={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Text>
      </Box>
    </Flex>
  );
}

function ThinkingRow({ ev }: { ev: AgentThinkingEvent }) {
  const [open, setOpen] = useState(false);
  const text =
    ev.thinking ??
    (ev.content ?? [])
      .filter((b): b is ThinkingBlock => b.type === "thinking")
      .map((b) => b.thinking)
      .join("");
  if (!text) return null;
  return (
    <Box my="1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          color: "var(--gray-10)",
        }}
      >
        {open ? "▼" : "▶"} thinking
      </button>
      {open ? (
        <Box
          mt="1"
          p="2"
          style={{
            background: "var(--gray-a2)",
            borderRadius: 4,
            fontFamily: "var(--code-font-family)",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            color: "var(--gray-11)",
          }}
        >
          {text}
        </Box>
      ) : null}
    </Box>
  );
}

function ToolChip({ label, input }: { label: string; input: unknown }) {
  const [open, setOpen] = useState(false);
  const str = typeof input === "string" ? input : JSON.stringify(input);
  const preview = str.length > 72 ? `${str.slice(0, 72)}…` : str;
  return (
    <Box my="1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 8px",
          borderRadius: 6,
          background: "var(--gray-a3)",
          border: "1px solid var(--gray-a4)",
          cursor: "pointer",
          fontFamily: "var(--code-font-family)",
          fontSize: 11,
          color: "var(--gray-12)",
        }}
      >
        🔧 <strong>{label}</strong>
        <span style={{ color: "var(--gray-10)" }}>{preview}</span>
      </button>
      {open ? (
        <Box
          mt="1"
          p="2"
          style={{
            background: "var(--gray-a2)",
            borderRadius: 4,
            fontFamily: "var(--code-font-family)",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            color: "var(--gray-12)",
          }}
        >
          {str.length > 4000 ? `${str.slice(0, 4000)}…` : str}
        </Box>
      ) : null}
    </Box>
  );
}

function renderEvent(ev: AgentRunEvent, key: string): ReactElement | null {
  switch (ev.type) {
    case "user.message":
      return <UserBubble key={key} ev={ev as UserMessageEvent} />;
    case "agent.message":
      return <AgentMessage key={key} ev={ev as AgentMessageEvent} />;
    case "agent.thinking":
      return <ThinkingRow key={key} ev={ev as AgentThinkingEvent} />;
    case "agent.tool_use": {
      const e = ev as AgentToolUseEvent;
      return <ToolChip key={key} label={e.name} input={e.input} />;
    }
    case "agent.mcp_tool_use": {
      const e = ev as AgentMcpToolUseEvent;
      return (
        <ToolChip
          key={key}
          label={`${e.server_name ? `${e.server_name}.` : ""}${e.name}`}
          input={e.input}
        />
      );
    }
    case "agent.custom_tool_use": {
      const e = ev as AgentCustomToolUseEvent;
      // present_result renders in the right rail, not the conversation.
      if (e.name === PRESENT_RESULT_TOOL_NAME) return null;
      return <ToolChip key={key} label={e.name} input={e.input} />;
    }
    default:
      // session.* / span.* / tool_result / custom_tool_result — protocol noise.
      return null;
  }
}

export function ChatThread({ events }: { events: AgentRunEvent[] }) {
  return <>{events.map((ev, i) => renderEvent(ev, `${ev.id ?? "ev"}-${i}`))}</>;
}
