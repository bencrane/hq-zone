/**
 * useAgentChat — the chat session state machine for the gtm-agent surface.
 *
 * One long-lived session per page mount (unlike <AgentRunPanel>, which tears
 * down on close). First `send` mints the session via createAgentRun; later
 * sends append a user.message to the open stream. On mount of the session we
 * BOTH open the live SSE stream AND backfill history via listAgentRunEvents —
 * the mint seeds the first user.message server-side and the agent may reply
 * before the stream attaches, so backfill closes that race (the documented
 * "history before tailing live" pattern).
 *
 * Events are deduped by their server id and rendered in processed_at order, so
 * the backfill/live overlap collapses cleanly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AgentRunEvent,
  createAgentRun,
  listAgentRunEvents,
  sendUserEvent,
  streamAgentRun,
} from "@/lib/agentRuns";

export type ChatStatus = "idle" | "connecting" | "running" | "ready" | "error";

export interface UseAgentChat {
  sessionId: string | null;
  events: AgentRunEvent[];
  status: ChatStatus;
  /** True while the very first message is minting a session. */
  starting: boolean;
  error: string | null;
  /** Send a message. Mints the session on the first call, appends after. */
  send: (text: string) => void;
}

export function useAgentChat(): UseAgentChat {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

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
      // ISO processed_at sorts lexically == chronologically; id-less events
      // (no timestamp) fall back to insertion order via a stable sort.
      next.sort((a, b) => {
        const pa = a.processed_at ?? "";
        const pb = b.processed_at ?? "";
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      });
      return next;
    });
  }, []);

  // Open the live stream + backfill history once a session exists.
  useEffect(() => {
    if (!sessionId) return;
    const abort = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const hist = await listAgentRunEvents(sessionId, { limit: 200 });
        if (!cancelled) ingest(hist.data);
      } catch {
        // Non-fatal: the live stream still tails forward from here.
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
          .then((run) => setSessionId(run.session_id))
          .catch((err) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setStarting(false));
        return;
      }
      // Stream is already open; the echo + agent reply arrive via SSE.
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

  return { sessionId, events, status, starting, error, send };
}
