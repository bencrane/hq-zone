/**
 * <AgentRunPanel> — operator-facing drawer for an in-flight gtm-agent run.
 *
 * Layout (locked):
 *   - LEFT lane:  user controls only (context display, Stop, future composer).
 *   - RIGHT lane: <AgentTimeline> — everything the agent emits.
 *
 * The drawer mints the agent run on mount via createAgentRunFromSignal
 * (when opened from a signal row), opens the SSE stream, and tails events
 * into local state. AbortController is bound to the stream so a close
 * propagates all the way back to hq-x → Anthropic.
 *
 * Reconnect (the docs-prescribed "history list before tailing live"
 * pattern) is intentionally NOT implemented in v1: a panel close fully
 * tears down the session view, and re-opening the same signal mints a
 * fresh session. Adding reconnect requires persistence of the panel's
 * session_id across remounts; it's a Stage 7 (hardening) item.
 */
import { Badge, Box, Button, Code, Dialog, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";

import type { AgentRunEvent, CreateAgentRunResponse } from "../lib/agentRuns";
import { createAgentRunFromSignal, interruptAgentRun, streamAgentRun } from "../lib/agentRuns";

import { AgentTimeline, type TimelineStatus } from "./agent_timeline/AgentTimeline";

export interface AgentRunPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signalSlug: string;
  limit?: number;
  target?: "test" | "prod";
}

interface PanelState {
  session: CreateAgentRunResponse | null;
  events: AgentRunEvent[];
  status: TimelineStatus | null;
  mintError: string | null;
  interruptInFlight: boolean;
}

const INITIAL_STATE: PanelState = {
  session: null,
  events: [],
  status: { type: "connecting" },
  mintError: null,
  interruptInFlight: false,
};

export function AgentRunPanel({ open, onOpenChange, signalSlug, limit = 50, target = "test" }: AgentRunPanelProps) {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  // Stable container for the stream's AbortController so we can hit Stop
  // from the left lane and clean up on unmount without re-creating
  // useEffect dependencies.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;

    // Fresh state on every open. A second open of the same signal mints a
    // brand-new session (see file-level note re: reconnect).
    setState(INITIAL_STATE);
    const abort = new AbortController();
    abortRef.current = abort;
    let cancelled = false;

    (async () => {
      let session: CreateAgentRunResponse;
      try {
        session = await createAgentRunFromSignal({ signal_slug: signalSlug, limit, target });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, mintError: err instanceof Error ? err.message : String(err), status: { type: "session.error", detail: "mint failed" } }));
        return;
      }
      if (cancelled) return;
      setState((s) => ({ ...s, session }));

      try {
        for await (const ev of streamAgentRun(session.session_id, abort.signal)) {
          if (cancelled) return;
          setState((s) => {
            const events = [...s.events, ev];
            const status = nextStatus(s.status, ev);
            return { ...s, events, status };
          });
        }
      } catch (err) {
        if (cancelled || abort.signal.aborted) return;
        setState((s) => ({
          ...s,
          status: { type: "session.error", detail: err instanceof Error ? err.message : String(err) },
        }));
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      abortRef.current = null;
    };
  }, [open, signalSlug, limit, target]);

  async function handleStop() {
    if (!state.session || state.interruptInFlight) return;
    setState((s) => ({ ...s, interruptInFlight: true }));
    try {
      await interruptAgentRun(state.session.session_id);
    } catch {
      // soft failure — leave the stream open; operator can close the drawer.
    } finally {
      setState((s) => ({ ...s, interruptInFlight: false }));
    }
  }

  function handleClose() {
    abortRef.current?.abort();
    onOpenChange(false);
  }

  const sessionId = state.session?.session_id ?? null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <Dialog.Content maxWidth="1200px" style={{ width: "min(95vw, 1200px)", height: "85vh", padding: 0 }}>
        <Flex direction="row" height="100%">
          {/* ── LEFT LANE: user controls only ───────────────────────────── */}
          <Box width="320px" p="4" style={{ borderRight: "1px solid var(--gray-a4)", overflowY: "auto" }}>
            <Heading size="3" mb="1">Run agent</Heading>
            <Text as="div" size="1" color="gray" mb="3">on signal</Text>
            <Box mb="3">
              <Code size="2">{signalSlug}</Code>
            </Box>

            <Separator size="4" my="3" />

            <Box mb="3">
              <Text as="div" size="1" color="gray">target</Text>
              <Badge color={target === "prod" ? "tomato" : "gray"} variant="soft">{target}</Badge>
            </Box>
            <Box mb="3">
              <Text as="div" size="1" color="gray">limit</Text>
              <Text size="2">{limit}</Text>
            </Box>

            {sessionId ? (
              <Box mb="3">
                <Text as="div" size="1" color="gray">session</Text>
                <Code size="1" style={{ wordBreak: "break-all" }}>{sessionId}</Code>
              </Box>
            ) : null}

            {state.session?.agent_id ? (
              <Box mb="3">
                <Text as="div" size="1" color="gray">agent</Text>
                <Code size="1" style={{ wordBreak: "break-all" }}>{state.session.agent_id}</Code>
              </Box>
            ) : null}

            {state.mintError ? (
              <Box mb="3">
                <Text size="1" color="tomato">{state.mintError}</Text>
              </Box>
            ) : null}

            <Separator size="4" my="3" />

            <Flex direction="column" gap="2">
              <Button
                color="tomato"
                variant="soft"
                disabled={!sessionId || state.interruptInFlight || isTerminal(state.status)}
                onClick={handleStop}
              >
                {state.interruptInFlight ? "Stopping…" : "Stop ⏸"}
              </Button>
              <Button variant="soft" color="gray" onClick={handleClose}>Close</Button>
            </Flex>
          </Box>

          {/* ── RIGHT LANE: agent timeline ──────────────────────────────── */}
          <Box flexGrow="1" style={{ overflow: "hidden" }}>
            <AgentTimeline events={state.events} status={state.status} />
          </Box>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function nextStatus(prev: TimelineStatus | null, ev: AgentRunEvent): TimelineStatus | null {
  switch (ev.type) {
    case "session.status_running":
      return { type: "session.status_running" };
    case "session.status_idle": {
      const sr = (ev as { stop_reason?: { type?: string; event_ids?: string[] } | null }).stop_reason;
      let detail: string | undefined;
      if (sr?.type) {
        detail = `stop_reason: ${sr.type}`;
        if (sr.type === "requires_action" && sr.event_ids?.length) {
          detail += ` (${sr.event_ids.length} blocking)`;
        }
      }
      return { type: "session.status_idle", detail };
    }
    case "session.status_rescheduled":
      return { type: "session.status_rescheduled", detail: "transient error — retrying" };
    case "session.status_terminated":
      return { type: "session.status_terminated", detail: "session ended" };
    case "session.error": {
      const msg = (ev as { error?: { message?: string } }).error?.message;
      return { type: "session.error", detail: msg };
    }
    default:
      return prev;
  }
}

function isTerminal(s: TimelineStatus | null): boolean {
  if (!s) return false;
  return s.type === "session.status_terminated" || s.type === "session.error" ||
    (s.type === "session.status_idle" && (s.detail?.startsWith("stop_reason: end_turn") ?? false));
}
