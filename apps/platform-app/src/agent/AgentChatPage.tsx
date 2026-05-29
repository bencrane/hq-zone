/**
 * AgentChatPage — `/agent`. The chat-with-gtm-agent surface.
 *
 * A contained, centered app surface (NOT full-bleed). Three columns inside a
 * bordered panel:
 *   - SIDEBAR (collapsible): past chats — reopen, rename, delete, new.
 *   - LEFT:  conversation (<ChatThread>) + a large composer.
 *   - RIGHT: a persistent results rail (<ResultsRail>) for present_result cards.
 *
 * The page owns the active session id; <useAgentChat> loads/tails it and mints
 * a new one on the first message. The session list is server-backed (per-operator,
 * via the agent-runs API over business.agent_runs); the conversation reloads from
 * the server on reopen.
 *
 * Built on @radix-ui/themes components throughout.
 */
import {
  Avatar,
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { Send, Sparkles } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AgentRunSummary,
  deleteAgentRun,
  listAgentRuns,
  renameAgentRun,
} from "@/lib/agentRuns";
import { useAuth } from "@/lib/auth";

import { ChatThread } from "./ChatThread";
import { ResultsRail } from "./ResultsRail";
import { SessionSidebar } from "./SessionSidebar";
import { type ChatStatus, useAgentChat } from "./useAgentChat";

const COLLAPSE_KEY = "hq:agentSidebarCollapsed";

const STATUS_META: Record<
  ChatStatus,
  { label: string; color: "gray" | "grass" | "blue" | "tomato" }
> = {
  idle: { label: "Ready", color: "gray" },
  connecting: { label: "Connecting", color: "blue" },
  running: { label: "Working", color: "blue" },
  ready: { label: "Ready", color: "grass" },
  error: { label: "Error", color: "tomato" },
};

const STARTERS = [
  "Find accounts showing buying intent this week",
  "Build a CISO audience from the warehouse",
  "Rank my open pipeline by conviction",
  "Draft outreach for security leaders",
];

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "U";
  const handle = email.split("@")[0] ?? "";
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? handle[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function AgentChatPage() {
  const { session } = useAuth();
  const initials = useMemo(() => initialsFromEmail(session?.user?.email), [session]);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AgentRunSummary[]>([]);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const refreshSessions = useCallback(() => {
    listAgentRuns()
      .then(setSessions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const chat = useAgentChat(activeSessionId, (run) => {
    // The ledger row is written server-side on mint (title = first message);
    // surface it and switch to the new session.
    setActiveSessionId(run.session_id);
    refreshSessions();
  });

  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional run-on-change.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.events.length]);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

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
  const empty = chat.events.length === 0 && !chat.starting;
  const working = chat.status === "running" || chat.status === "connecting" || chat.starting;

  return (
    <Box style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <Flex
        align="center"
        justify="center"
        p={{ initial: "2", md: "5" }}
        style={{ minHeight: "100vh" }}
      >
        <Box
          style={{
            width: "100%",
            maxWidth: 1320,
            height: "min(92vh, 1040px)",
            border: "1px solid var(--gray-a5)",
            borderRadius: "var(--radius-5)",
            background: "var(--color-panel-solid)",
            overflow: "hidden",
            boxShadow: "var(--shadow-5)",
          }}
        >
          <Flex direction="row" height="100%">
            <SessionSidebar
              sessions={sessions}
              activeId={activeSessionId}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
              onNew={() => setActiveSessionId(null)}
              onSelect={(id) => setActiveSessionId(id)}
              onRename={(id, title) => {
                renameAgentRun(id, title)
                  .then(refreshSessions)
                  .catch(() => {});
              }}
              onDelete={(id) => {
                deleteAgentRun(id)
                  .then(() => {
                    if (id === activeSessionId) setActiveSessionId(null);
                    refreshSessions();
                  })
                  .catch(() => {});
              }}
            />

            <Flex direction="column" flexGrow="1" style={{ minWidth: 0 }}>
              {/* Header */}
              <Flex
                align="center"
                justify="between"
                px="5"
                py="4"
                style={{ borderBottom: "1px solid var(--gray-a4)" }}
              >
                <Flex align="center" gap="3">
                  <Avatar
                    size="2"
                    radius="medium"
                    variant="soft"
                    color="grass"
                    fallback={<Sparkles size={16} />}
                  />
                  <Box>
                    <Heading size="4" weight="medium">
                      GTM Agent
                    </Heading>
                    <Text as="div" size="1" color="gray">
                      Research accounts, build audiences, draft outreach
                    </Text>
                  </Box>
                </Flex>
                <Badge color={meta.color} variant="soft" radius="full" size="2">
                  {working && chat.status !== "error" ? <Spinner size="1" /> : null}
                  {meta.label}
                </Badge>
              </Flex>

              {/* Body: conversation + results */}
              <Flex flexGrow="1" style={{ minHeight: 0 }}>
                {/* LEFT — conversation + composer */}
                <Flex
                  direction="column"
                  style={{ flex: "1 1 48%", minWidth: 0, borderRight: "1px solid var(--gray-a4)" }}
                >
                  <ScrollArea scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
                    <Box px="5" py="4" style={{ height: "100%" }}>
                      {empty ? (
                        <Flex
                          direction="column"
                          align="center"
                          justify="center"
                          gap="5"
                          style={{ minHeight: "60vh" }}
                        >
                          <Avatar
                            size="5"
                            radius="full"
                            variant="soft"
                            color="grass"
                            fallback={<Sparkles size={26} />}
                          />
                          <Box style={{ textAlign: "center", maxWidth: 400 }}>
                            <Heading size="5" mb="1">
                              What can I help you ship?
                            </Heading>
                            <Text size="2" color="gray">
                              Ask the GTM agent to research accounts, build an audience, or draft
                              outreach — results appear on the right as it works.
                            </Text>
                          </Box>
                          <Flex direction="column" gap="2" width="100%" style={{ maxWidth: 440 }}>
                            {STARTERS.map((s) => (
                              <Button
                                key={s}
                                variant="soft"
                                color="gray"
                                size="3"
                                radius="large"
                                style={{ justifyContent: "flex-start", cursor: "pointer" }}
                                onClick={() => chat.send(s)}
                              >
                                {s}
                              </Button>
                            ))}
                          </Flex>
                        </Flex>
                      ) : (
                        <>
                          <ChatThread events={chat.events} userInitials={initials} />
                          {working ? (
                            <Flex gap="2" align="center" my="3">
                              <Avatar
                                size="1"
                                radius="medium"
                                variant="soft"
                                color="grass"
                                fallback={<Sparkles size={14} />}
                              />
                              <Flex
                                align="center"
                                gap="2"
                                px="3"
                                py="2"
                                style={{
                                  background: "var(--gray-a3)",
                                  borderRadius: "12px 12px 12px 2px",
                                }}
                              >
                                <Spinner size="1" />
                                <Text size="2" color="gray">
                                  Working…
                                </Text>
                              </Flex>
                            </Flex>
                          ) : null}
                          {chat.error ? (
                            <Callout.Root color="tomato" size="1" mt="2">
                              <Callout.Text>{chat.error}</Callout.Text>
                            </Callout.Root>
                          ) : null}
                          <div ref={endRef} />
                        </>
                      )}
                    </Box>
                  </ScrollArea>

                  {/* Composer — large */}
                  <Box p="4" style={{ borderTop: "1px solid var(--gray-a4)" }}>
                    <Box style={{ position: "relative" }}>
                      <TextArea
                        size="3"
                        value={draft}
                        onChange={(e) => setDraft(e.currentTarget.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Describe your GTM goal…"
                        resize="none"
                        style={{ minHeight: 132, paddingRight: 56 }}
                      />
                      <Box style={{ position: "absolute", right: 10, bottom: 10 }}>
                        <IconButton
                          color="grass"
                          size="3"
                          radius="large"
                          disabled={chat.starting || draft.trim().length === 0}
                          onClick={submit}
                          aria-label="Send"
                          style={{ cursor: "pointer" }}
                        >
                          <Send size={18} />
                        </IconButton>
                      </Box>
                    </Box>
                    <Text as="div" size="1" color="gray" mt="2">
                      Enter to send · Shift + Enter for a new line
                    </Text>
                  </Box>
                </Flex>

                {/* RIGHT — results rail */}
                <Flex
                  direction="column"
                  style={{ flex: "1 1 52%", minWidth: 0, background: "var(--gray-a1)" }}
                >
                  <Flex
                    align="center"
                    px="5"
                    py="4"
                    style={{ borderBottom: "1px solid var(--gray-a4)" }}
                  >
                    <Heading size="3" weight="medium" color="gray">
                      Results
                    </Heading>
                  </Flex>
                  <ScrollArea scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
                    <ResultsRail events={chat.events} />
                  </ScrollArea>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
