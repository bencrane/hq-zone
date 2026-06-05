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
  type TextBlock,
  type UserMessageEvent,
  createAgentRun,
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
  error: string | null;
  send: (text: string) => void;
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

  // Reset + load whenever the active session changes (including → null).
  useEffect(() => {
    seen.current = new Set();
    setError(null);
    // Preserve the optimistic first message across the mint→activate reset.
    const seed = pendingFirstRef.current;
    pendingFirstRef.current = null;
    setEvents(seed ? [seed] : []);
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
  }, [sessionId, ingest]);

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
        setEvents((prev) => prev.filter((e) => e.id !== optimistic.id));
        setError(err instanceof Error ? err.message : String(err));
      });
    },
    [sessionId, mintOptimistic],
  );

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

  return { events, status, starting, error, send };
}
