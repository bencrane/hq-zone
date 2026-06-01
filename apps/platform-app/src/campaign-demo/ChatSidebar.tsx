/**
 * ChatSidebar — the AI Chat pane (right). Mirrors the legacy 3-pane layout's
 * assistant column.
 *
 * Presentational + a typed seam: it owns the transcript and composer, and
 * delegates every turn to `onSend(text) => Promise<string>`. The parent wires
 * that seam — today to a local design-assist responder; the same seam accepts
 * the dmaas scaffold-authoring agent / gtm-agent when that backend is attached,
 * with no change to this component.
 */
import {
  Avatar,
  Box,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { Send, Sparkles } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const STARTERS = [
  "Make the headline bigger",
  "Why didn't this layout solve?",
  "Suggest a stronger CTA",
  "What spec fits a #10 envelope?",
];

export function ChatSidebar({
  onSend,
  title = "Design assistant",
  subtitle = "Iterate copy, debug solves, tune the layout",
}: {
  onSend: (text: string) => Promise<string>;
  title?: string;
  subtitle?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new turns.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", text: t }]);
    setBusy(true);
    try {
      const reply = await onSend(t);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  const empty = messages.length === 0;

  return (
    <Flex
      direction="column"
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: "1px solid var(--gray-a4)",
        minHeight: 0,
        background: "var(--gray-a1)",
      }}
    >
      <Flex
        align="center"
        gap="2"
        px="4"
        py="3"
        style={{ borderBottom: "1px solid var(--gray-a4)" }}
      >
        <Avatar
          size="1"
          radius="medium"
          variant="soft"
          color="grass"
          fallback={<Sparkles size={14} />}
        />
        <Box>
          <Heading size="3" weight="medium">
            {title}
          </Heading>
          <Text as="div" size="1" color="gray">
            {subtitle}
          </Text>
        </Box>
      </Flex>

      <ScrollArea scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
        <Flex direction="column" gap="3" p="4">
          {empty ? (
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">
                Ask the assistant to refine the design. Suggestions:
              </Text>
              {STARTERS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => void send(s)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    background: "var(--gray-a3)",
                    border: "1px solid var(--gray-a4)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    color: "var(--gray-12)",
                    fontSize: 13,
                  }}
                >
                  {s}
                </button>
              ))}
            </Flex>
          ) : (
            messages.map((m, i) => <Bubble key={`${m.role}:${i}`} message={m} />)
          )}
          {busy ? (
            <Flex gap="2" align="center">
              <Avatar
                size="1"
                radius="medium"
                variant="soft"
                color="grass"
                fallback={<Sparkles size={12} />}
              />
              <Flex
                align="center"
                gap="2"
                px="3"
                py="2"
                style={{ background: "var(--gray-a3)", borderRadius: "12px 12px 12px 2px" }}
              >
                <Spinner size="1" />
                <Text size="1" color="gray">
                  Thinking…
                </Text>
              </Flex>
            </Flex>
          ) : null}
          <div ref={endRef} />
        </Flex>
      </ScrollArea>

      <Box p="3" style={{ borderTop: "1px solid var(--gray-a4)", flexShrink: 0 }}>
        <Box style={{ position: "relative" }}>
          <TextArea
            size="2"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about the design…"
            resize="none"
            style={{ minHeight: 76, paddingRight: 44 }}
          />
          <Box style={{ position: "absolute", right: 8, bottom: 8 }}>
            <IconButton
              color="grass"
              size="2"
              radius="large"
              disabled={busy || draft.trim().length === 0}
              onClick={() => void send(draft)}
              aria-label="Send"
              style={{ cursor: "pointer" }}
            >
              <Send size={16} />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <Flex justify={isUser ? "end" : "start"}>
      <Box
        style={{
          maxWidth: "85%",
          padding: "8px 11px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser ? "var(--accent-a4)" : "var(--gray-a3)",
          color: "var(--gray-12)",
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {message.text}
      </Box>
    </Flex>
  );
}
