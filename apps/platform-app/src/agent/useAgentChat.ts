/**
 * useAgentChat — chat state for ONE session, controlled by the page.
 *
 * The page owns which session is active (so the sidebar can switch between
 * past chats); this hook just loads + tails whatever `sessionId` it's given:
 *   - sessionId changes → reset, backfill history via listAgentRunEvents, then
 *     tail the live SSE stream. Backfill closes the mint→stream race so the
 *     agent's first turn is never dropped.
 *   - send() with a null sessionId mints a new session via createAgentRun and
 *     calls onCreated(run, firstMessage); the page then sets it active (which
 *     triggers the load above). send() with a session appends a user.message.
 *
 * Events are deduped by server id and ordered by processed_at.
 *
 * OPTIMISTIC ECHO. send() renders the operator's message IMMEDIATELY — it does
 * not wait for the server to persist and stream it back. The message is appended
 * to `events` with a client-minted `local:` id; when the server later echoes the
 * confirmed copy (its own id, same text), reconcileOptimistic() drops the local
 * placeholder one-for-one, so there is never a duplicate bubble. Without this the
 * UI looks frozen on any server latency — you cannot tell "didn't send" from
 * "sent, server slow", which makes the chat impossible to debug.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AgentRunEvent,
  type CreateAgentRunResponse,
  SendUserEventError,
  type TextBlock,
  type UserMessageEvent,
  createAgentRun,
  interruptAgentRun,
  listAgentRunEvents,
  sendUserEvent,
  streamAgentRun,
} from "@/lib/agentRuns";

export type ChatStatus = "idle" | "connecting" | "running" | "ready" | "error";

export interface UseAgentChat {
  events: AgentRunEvent[];
  status: ChatStatus;
  /** True while a brand-new session is minting. */
  starting: boolean;
  /**
   * True while the agent is actively working a turn (or a turn is open and
   * blocking new input). Drives the "kill" control in the composer — a turn
   * that hangs here is the lockout the operator needs to be able to cut.
   */
  busy: boolean;
  error: string | null;
  send: (text: string) => void;
  /**
   * Cut the current turn via user.interrupt. Recovers a session that is stuck
   * mid-turn or wedged waiting on a tool ack. Degrades gracefully: if the
   * session is already terminal (terminated/expired) the interrupt itself is
   * rejected, and we surface a clear "start a new chat" message instead of a
   * raw 502. No-op when there is no active session.
   */
  interrupt: () => void;
}

/** Prefix marking a client-minted (optimistic, not-yet-confirmed) event id. */
const LOCAL_PREFIX = "local:";

function isOptimistic(ev: AgentRunEvent): boolean {
  return typeof ev.id === "string" && ev.id.startsWith(LOCAL_PREFIX);
}

function userMessageText(ev: AgentRunEvent): string {
  const content = (ev as UserMessageEvent).content ?? [];
  return content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function byProcessedAt(a: AgentRunEvent, b: AgentRunEvent): number {
  const pa = a.processed_at ?? "";
  const pb = b.processed_at ?? "";
  return pa < pb ? -1 : pa > pb ? 1 : 0;
}

/**
 * Drop optimistic user.messages once the server has echoed an equivalent
 * confirmed (server-id) user.message. Matching is by text, one-for-one — so
 * sending the same text twice collapses exactly two placeholders against two
 * confirmations, never one. Returns the same array reference when nothing is
 * reconciled, so React state stays referentially stable.
 */
function reconcileOptimistic(list: AgentRunEvent[]): AgentRunEvent[] {
  const confirmed = new Map<string, number>();
  for (const ev of list) {
    if (ev.type === "user.message" && !isOptimistic(ev)) {
      const k = userMessageText(ev);
      confirmed.set(k, (confirmed.get(k) ?? 0) + 1);
    }
  }
  if (confirmed.size === 0) return list;

  let dropped = false;
  const out: AgentRunEvent[] = [];
  for (const ev of list) {
    if (ev.type === "user.message" && isOptimistic(ev)) {
      const k = userMessageText(ev);
      const remaining = confirmed.get(k) ?? 0;
      if (remaining > 0) {
        confirmed.set(k, remaining - 1);
        dropped = true;
        continue;
      }
    }
    out.push(ev);
  }
  return dropped ? out : list;
}

export function useAgentChat(
  sessionId: string | null,
  onCreated: (run: CreateAgentRunResponse, firstMessage: string) => void,
): UseAgentChat {
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the load/tail effect WITHOUT changing the active
  // session — used to re-open the SSE stream so hq-x's present_result
  // reconcile fires and heals a session wedged on an un-acked tool result.
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  // Keep onCreated current without making send() unstable.
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const localSeq = useRef(0);
  // A brand-new session resets `events` to [] the moment it activates (see the
  // sessionId effect). Stash the optimistic first message here so it survives
  // that reset instead of vanishing until the server backfills it.
  const pendingFirstRef = useRef<AgentRunEvent | null>(null);

  const mintOptimistic = useCallback((text: string): AgentRunEvent => {
    localSeq.current += 1;
    return {
      id: `${LOCAL_PREFIX}${localSeq.current}`,
      type: "user.message",
      content: [{ type: "text", text }],
      processed_at: new Date().toISOString(),
    };
  }, []);

  const ingest = useCallback((incoming: AgentRunEvent[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const next = prev.slice();
      let added = false;
      for (const ev of incoming) {
        if (ev.id) {
          if (seen.current.has(ev.id)) continue;
          seen.current.add(ev.id);
        }
        next.push(ev);
        added = true;
      }
      if (!added) return prev;
      next.sort(byProcessedAt);
      // A freshly-ingested confirmed user.message may supersede an optimistic
      // placeholder — collapse the pair so the bubble doesn't double up.
      return reconcileOptimistic(next);
    });
  }, []);

  // Tracks which session `events`/`seen` currently reflect, so a stream
  // *reconnect* (reconnectNonce bump) re-tails without wiping the conversation,
  // while a true session switch still resets cleanly.
  const loadedSessionRef = useRef<string | null>(null);

  // Reset (on session change) + load + tail. Re-runs on reconnectNonce to
  // re-open the SSE stream (heals a wedged session via hq-x reconcile). The
  // `void reconnectNonce` read makes that re-trigger an honest dependency
  // rather than a lint-suppressed one.
  useEffect(() => {
    void reconnectNonce;
    const isSessionSwitch = loadedSessionRef.current !== sessionId;
    if (isSessionSwitch) {
      loadedSessionRef.current = sessionId;
      seen.current = new Set();
      setError(null);
      // Preserve the optimistic first message across the mint→activate reset.
      const seed = pendingFirstRef.current;
      pendingFirstRef.current = null;
      setEvents(seed ? [seed] : []);
    }
    if (!sessionId) return;

    const abort = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const hist = await listAgentRunEvents(sessionId, { limit: 500 });
        if (!cancelled) ingest(hist.data);
      } catch {
        // Non-fatal: the live stream still tails forward.
      }
    })();

    (async () => {
      try {
        for await (const ev of streamAgentRun(sessionId, abort.signal)) {
          if (cancelled) return;
          ingest([ev]);
        }
      } catch (err) {
        if (cancelled || abort.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [sessionId, ingest, reconnectNonce]);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      setError(null);

      // New session: echo the message instantly, stash it so the activate-reset
      // keeps it, then mint the session. Roll the echo back if the mint fails.
      if (!sessionId) {
        const optimistic = mintOptimistic(t);
        setEvents([optimistic]);
        pendingFirstRef.current = optimistic;
        setStarting(true);
        createAgentRun({ initial_message: t, title: t.slice(0, 80) })
          .then((run) => onCreatedRef.current(run, t))
          .catch((err) => {
            pendingFirstRef.current = null;
            setEvents((prev) => prev.filter((e) => e.id !== optimistic.id));
            setError(err instanceof Error ? err.message : String(err));
          })
          .finally(() => setStarting(false));
        return;
      }

      // Existing session: append the echo synchronously, then POST. The server
      // echo (confirmed id) reconciles the placeholder away; a POST failure
      // rolls it back and surfaces the error.
      const optimistic = mintOptimistic(t);
      setEvents((prev) => {
        const next = [...prev, optimistic];
        next.sort(byProcessedAt);
        return next;
      });
      sendUserEvent(sessionId, {
        type: "user.message",
        content: [{ type: "text", text: t }],
      }).catch((err) => {
        // Always roll the optimistic echo back — the message did not land.
        setEvents((prev) => prev.filter((e) => e.id !== optimistic.id));

        if (err instanceof SendUserEventError && err.isRecoverableBusy) {
          // The session is mid-turn or wedged waiting on a tool-result ack
          // (e.g. an un-acked present_result). Re-open the stream so hq-x's
          // reconcile acks the open tool call and drains the session back to
          // idle; show a calm, actionable message instead of a raw 502.
          setError(
            "The agent is still finishing its previous step. Reconnecting — " +
              "send your message again in a moment, or press Stop to cut the turn.",
          );
          setReconnectNonce((n) => n + 1);
          return;
        }
        if (err instanceof SendUserEventError && err.isTerminal) {
          setError("This chat has ended. Start a new chat to continue.");
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
    },
    [sessionId, mintOptimistic],
  );

  const interrupt = useCallback(() => {
    if (!sessionId) return;
    setError(null);
    interruptAgentRun(sessionId)
      .then(() => {
        // The interrupt landed; re-open the stream so the resulting
        // status_idle / end_turn frames (and any reconcile) flow in promptly.
        setReconnectNonce((n) => n + 1);
      })
      .catch((err) => {
        if (err instanceof SendUserEventError && err.isTerminal) {
          setError("This chat has already ended. Start a new chat to continue.");
          return;
        }
        // A non-terminal interrupt failure is unexpected — surface it plainly.
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [sessionId]);

  const status = useMemo<ChatStatus>(() => {
    if (error) return "error";
    if (starting) return "connecting";
    for (let i = events.length - 1; i >= 0; i--) {
      const t = events[i].type;
      if (t === "session.error") return "error";
      if (t === "session.status_idle" || t === "session.status_terminated") return "ready";
      if (t === "session.status_running" || t === "session.status_rescheduled") return "running";
    }
    return sessionId ? "connecting" : "idle";
  }, [events, error, starting, sessionId]);

  // `busy` drives the kill control. It is true when a turn is open and could
  // hang: while minting, while the latest session-status frame is running, OR
  // while the session sits in requires_action (a wedged-on-tool-ack state that
  // reports idle at the top level but rejects new user.message — exactly the
  // lockout the operator must be able to cut). Terminal/idle-clean ⇒ not busy.
  const busy = useMemo<boolean>(() => {
    if (starting) return true;
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const t = ev.type;
      if (t === "session.status_running" || t === "session.status_rescheduled") return true;
      if (t === "session.status_terminated") return false;
      if (t === "session.status_idle") {
        const sr = (ev as { stop_reason?: { type?: string } | null }).stop_reason;
        // A present_result/tool-confirmation requires_action leaves the turn
        // open even though status reads idle — treat as busy so Stop shows.
        return sr?.type === "requires_action";
      }
    }
    return false;
  }, [events, starting]);

  return { events, status, starting, busy, error, send, interrupt };
}
