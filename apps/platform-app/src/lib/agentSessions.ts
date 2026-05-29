/**
 * Agent chat sessions — local index (localStorage-backed) of gtm-agent
 * sessions started in this browser, so the sidebar can list past chats and
 * reopen them. The conversation ITSELF lives server-side (hq-x → Anthropic
 * /sessions/{id}/events); this only remembers which session ids are mine plus
 * a title + timestamps. Per-browser. A server-side "my runs" list
 * (business.agent_runs is already indexed for it) is the cross-device upgrade.
 *
 * Mirrors lib/leadLists.ts: full-array read-modify-write, subscriber fan-out,
 * cross-tab sync via the storage event.
 */
const STORAGE_KEY = "hq:agentSessions";

export interface ChatSession {
  /** Anthropic session_id (sesn_*). */
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

type Listener = (sessions: ChatSession[]) => void;
const listeners = new Set<Listener>();

function safeRead(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(sessions: ChatSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  for (const l of listeners) l(sessions);
}

/** Most-recently-updated first. */
export function listSessions(): ChatSession[] {
  return safeRead().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Upsert. On a known id, bumps updated_at and backfills an empty title. */
export function recordSession(id: string, title: string): void {
  const now = new Date().toISOString();
  const sessions = safeRead();
  const existing = sessions.find((s) => s.id === id);
  if (existing) {
    existing.updated_at = now;
    if (title && !existing.title) existing.title = title;
    safeWrite(sessions);
    return;
  }
  sessions.push({ id, title: title || "New chat", created_at: now, updated_at: now });
  safeWrite(sessions);
}

/** Bump a session to the top (e.g. on reopen). */
export function touchSession(id: string): void {
  const sessions = safeRead();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return;
  sessions[idx] = { ...sessions[idx], updated_at: new Date().toISOString() };
  safeWrite(sessions);
}

/** Set a session's title. Does NOT bump updated_at, so the list order holds. */
export function renameSession(id: string, title: string): void {
  const next = title.trim();
  if (!next) return;
  const sessions = safeRead();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return;
  sessions[idx] = { ...sessions[idx], title: next };
  safeWrite(sessions);
}

export function removeSession(id: string): void {
  safeWrite(safeRead().filter((s) => s.id !== id));
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) fn(safeRead());
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
