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
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AgentRunEvent,
  type CreateAgentRunResponse,
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
      next.sort((a, b) => {
        const pa = a.processed_at ?? "";
        const pb = b.processed_at ?? "";
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      });
      return next;
    });
  }, []);

  // Reset + load whenever the active session changes (including → null).
  useEffect(() => {
    seen.current = new Set();
    setEvents([]);
    setError(null);
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
      if (!sessionId) {
        setStarting(true);
        createAgentRun({ initial_message: t, title: t.slice(0, 80) })
          .then((run) => onCreatedRef.current(run, t))
          .catch((err) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setStarting(false));
        return;
      }
      sendUserEvent(sessionId, {
        type: "user.message",
        content: [{ type: "text", text: t }],
      }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
    },
    [sessionId],
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
