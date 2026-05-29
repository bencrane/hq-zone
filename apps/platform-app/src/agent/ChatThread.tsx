/**
 * ChatThread — the LEFT lane: the conversation. Agent turns carry a sparkle
 * Avatar; the operator's messages are right-aligned with an initials Avatar.
 * Thinking and tool-call rows render as indented, expandable sub-steps under
 * the agent column. present_result goes to the right rail; session.* / span.* /
 * tool_result frames are protocol noise and dropped.
 *
 * Built on @radix-ui/themes components — Avatar, Button, Flex, Box, Text.
 */
import { Avatar, Box, Button, Flex, Text } from "@radix-ui/themes";
import { Sparkles } from "lucide-react";
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

const AVATAR_COL = 36; // avatar width + gap, for aligning sub-steps under agent text

function joinText(content: ContentBlock[] | undefined): string {
  return (content ?? [])
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function AgentAvatar() {
  return (
    <Avatar
      size="1"
      radius="medium"
      variant="soft"
      color="grass"
      fallback={<Sparkles size={14} />}
    />
  );
}

function AgentMessage({ ev }: { ev: AgentMessageEvent }) {
  const text = joinText(ev.content);
  if (!text) return null;
  return (
    <Flex gap="2" align="start" my="3">
      <AgentAvatar />
      <Box
        px="3"
        py="2"
        style={{
          maxWidth: "84%",
          background: "var(--gray-a3)",
          borderRadius: "12px 12px 12px 2px",
        }}
      >
        <Text as="div" size="2" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
          {text}
        </Text>
      </Box>
    </Flex>
  );
}

function UserMessage({ ev, initials }: { ev: UserMessageEvent; initials: string }) {
  const text = joinText(ev.content);
  if (!text) return null;
  return (
    <Flex gap="2" align="start" justify="end" my="3">
      <Box
        px="3"
        py="2"
        style={{
          maxWidth: "84%",
          background: "var(--grass-a4)",
          border: "1px solid var(--grass-a5)",
          borderRadius: "12px 12px 2px 12px",
        }}
      >
        <Text as="div" size="2" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
          {text}
        </Text>
      </Box>
      <Avatar size="1" radius="full" variant="soft" color="gray" fallback={initials} />
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
    <Box my="1" style={{ marginLeft: AVATAR_COL }}>
      <Button variant="ghost" color="gray" size="1" onClick={() => setOpen((v) => !v)}>
        {open ? "▼" : "▶"} thinking
      </Button>
      {open ? (
        <Box
          mt="1"
          p="2"
          style={{
            background: "var(--gray-a2)",
            borderRadius: 6,
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

function ToolRow({ label, input }: { label: string; input: unknown }) {
  const [open, setOpen] = useState(false);
  const str = typeof input === "string" ? input : JSON.stringify(input);
  const preview = str.length > 64 ? `${str.slice(0, 64)}…` : str;
  return (
    <Box my="1" style={{ marginLeft: AVATAR_COL }}>
      <Button
        variant="soft"
        color="gray"
        size="1"
        radius="large"
        onClick={() => setOpen((v) => !v)}
      >
        🔧 {label}
        <Text color="gray" style={{ opacity: 0.7 }}>
          {preview}
        </Text>
      </Button>
      {open ? (
        <Box
          mt="1"
          p="2"
          style={{
            background: "var(--gray-a2)",
            borderRadius: 6,
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

function renderEvent(ev: AgentRunEvent, key: string, initials: string): ReactElement | null {
  switch (ev.type) {
    case "user.message":
      return <UserMessage key={key} ev={ev as UserMessageEvent} initials={initials} />;
    case "agent.message":
      return <AgentMessage key={key} ev={ev as AgentMessageEvent} />;
    case "agent.thinking":
      return <ThinkingRow key={key} ev={ev as AgentThinkingEvent} />;
    case "agent.tool_use": {
      const e = ev as AgentToolUseEvent;
      return <ToolRow key={key} label={e.name} input={e.input} />;
    }
    case "agent.mcp_tool_use": {
      const e = ev as AgentMcpToolUseEvent;
      return (
        <ToolRow
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
      return <ToolRow key={key} label={e.name} input={e.input} />;
    }
    default:
      return null; // session.* / span.* / tool_result / custom_tool_result
  }
}

export function ChatThread({
  events,
  userInitials,
}: {
  events: AgentRunEvent[];
  userInitials: string;
}) {
  return <>{events.map((ev, i) => renderEvent(ev, `${ev.id ?? "ev"}-${i}`, userInitials))}</>;
}
