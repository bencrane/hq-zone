/**
 * Workbooks — the top-level container in the Clay-shape model.
 * Each workbook holds one or more tables (typically a Companies
 * table plus People tables spawned from it).
 *
 * Storage shape:
 *   localStorage["hq:workbooks"] = JSON.stringify(Workbook[])
 *
 * Cross-tab updates via the storage event subscribe pattern.
 */

const STORAGE_KEY = "hq:workbooks";

export interface Workbook {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

type Listener = (workbooks: Workbook[]) => void;
const listeners = new Set<Listener>();

function safeRead(): Workbook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(workbooks: Workbook[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workbooks));
  for (const l of listeners) l(workbooks);
}

function shortId(): string {
  return `W${Math.random().toString(36).slice(2, 10)}`;
}

export function listWorkbooks(): Workbook[] {
  return safeRead().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getWorkbook(id: string): Workbook | null {
  return safeRead().find((w) => w.id === id) ?? null;
}

export function createWorkbook(name: string): Workbook {
  const now = new Date().toISOString();
  const w: Workbook = {
    id: shortId(),
    name,
    created_at: now,
    updated_at: now,
  };
  const list = safeRead();
  list.push(w);
  safeWrite(list);
  return w;
}

export function renameWorkbook(id: string, name: string): Workbook | null {
  const list = safeRead();
  const idx = list.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], name, updated_at: new Date().toISOString() };
  safeWrite(list);
  return list[idx];
}

export function touchWorkbook(id: string): void {
  const list = safeRead();
  const idx = list.findIndex((w) => w.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], updated_at: new Date().toISOString() };
  safeWrite(list);
}

export function deleteWorkbook(id: string): void {
  safeWrite(safeRead().filter((w) => w.id !== id));
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

/**
 * Returns the default workbook id, creating one if none exist.
 * Used when something needs *a* workbook and the caller doesn't care
 * which one.
 */
export function ensureDefaultWorkbook(): Workbook {
  const list = safeRead();
  if (list.length > 0) return list[0];
  return createWorkbook("Default workbook");
}
