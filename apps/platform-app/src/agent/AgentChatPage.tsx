/**
 * AgentChatPage — `/agent`. The chat-with-gtm-agent surface.
 *
 * Two lanes, deliberately not a single ChatGPT column:
 *   - LEFT:  the conversation (<ChatThread>) + the composer.
 *   - RIGHT: a persistent results rail (<ResultsRail>) where the agent's
 *            present_result cards land.
 *
 * All transport lives in useAgentChat (mint → stream + backfill → append).
 * This component is layout + composer + status only.
 */
import {
  Badge,
  Box,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { Send } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ChatThread } from "./ChatThread";
import { ResultsRail } from "./ResultsRail";
import { type ChatStatus, useAgentChat } from "./useAgentChat";

const STATUS_META: Record<
  ChatStatus,
  { label: string; color: "gray" | "grass" | "blue" | "tomato" }
> = {
  idle: { label: "Ready", color: "gray" },
  connecting: { label: "Connecting…", color: "blue" },
  running: { label: "Working…", color: "blue" },
  ready: { label: "Ready", color: "grass" },
  error: { label: "Error", color: "tomato" },
};

export default function AgentChatPage() {
  const chat = useAgentChat();
  const [draft, setDraft] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Autoscroll the conversation as events arrive. The body only touches the
  // ref, but it must re-run whenever a new event lands.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional run-on-change; the body reads only the ref.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.events.length]);

  function submit() {
    const t = draft.trim();
    if (!t || chat.starting) return;
    chat.send(t);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const meta = STATUS_META[chat.status];
  const hasConversation = chat.events.length > 0 || chat.starting;

  return (
    <Flex direction="column" style={{ height: "100vh" }}>
      {/* Header */}
      <Flex
        align="center"
        justify="between"
        px="4"
        py="3"
        style={{ borderBottom: "1px solid var(--gray-a4)" }}
      >
        <Flex align="center" gap="3">
          <Heading size="4">GTM Agent</Heading>
          <Badge color={meta.color} variant="soft" radius="full">
            {meta.label}
          </Badge>
        </Flex>
        <Link to="/" style={{ color: "var(--gray-11)", fontSize: 13, textDecoration: "none" }}>
          ← HQ
        </Link>
      </Flex>

      {/* Two lanes */}
      <Flex flexGrow="1" style={{ minHeight: 0 }}>
        {/* LEFT: conversation + composer */}
        <Flex
          direction="column"
          style={{ flex: "1 1 46%", minWidth: 0, borderRight: "1px solid var(--gray-a4)" }}
        >
          <ScrollArea type="auto" scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
            <Box px="4" py="3">
              {hasConversation ? (
                <>
                  <ChatThread events={chat.events} />
                  {chat.error ? (
                    <Text as="div" size="1" color="tomato" mt="2">
                      {chat.error}
                    </Text>
                  ) : null}
                  <div ref={threadEndRef} />
                </>
              ) : (
                <Flex align="center" justify="center" height="100%" px="4" py="9">
                  <Text size="2" color="gray" align="center">
                    Ask the GTM agent to research accounts, build an audience, or draft outreach.
                  </Text>
                </Flex>
              )}
            </Box>
          </ScrollArea>

          {/* Composer */}
          <Box p="3" style={{ borderTop: "1px solid var(--gray-a4)" }}>
            <Flex gap="2" align="end">
              <Box flexGrow="1">
                <TextArea
                  value={draft}
                  onChange={(e) => setDraft(e.currentTarget.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Describe your GTM goal…"
                  rows={2}
                  style={{ resize: "none" }}
                />
              </Box>
              <IconButton
                color="grass"
                size="3"
                disabled={chat.starting || draft.trim().length === 0}
                onClick={submit}
                aria-label="Send"
              >
                <Send size={16} />
              </IconButton>
            </Flex>
          </Box>
        </Flex>

        {/* RIGHT: results rail */}
        <Box style={{ flex: "1 1 54%", minWidth: 0, background: "var(--gray-a1)" }}>
          <ScrollArea type="auto" scrollbars="vertical" style={{ height: "100%" }}>
            <ResultsRail events={chat.events} />
          </ScrollArea>
        </Box>
      </Flex>
    </Flex>
  );
}
