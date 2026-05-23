/**
 * Lead lists — local state layer (localStorage-backed). Each list is
 * a named bag of person_ids. Prototype storage until lists move to
 * hq-x's gtm-initiatives schema.
 *
 * Storage shape:
 *   localStorage["hq:leadLists"] = JSON.stringify(LeadList[])
 *
 * All mutations re-serialize the full array. Read-modify-write is
 * single-threaded in the browser; no locking needed.
 */

const STORAGE_KEY = "hq:leadLists";

export interface LeadList {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  person_ids: string[];
}

type Listener = (lists: LeadList[]) => void;
const listeners = new Set<Listener>();

function safeRead(): LeadList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(lists: LeadList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  for (const l of listeners) l(lists);
}

export function listLists(): LeadList[] {
  return safeRead().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getList(id: string): LeadList | null {
  return safeRead().find((l) => l.id === id) ?? null;
}

export function createList(name: string, personIds: string[] = []): LeadList {
  const now = new Date().toISOString();
  const id = `L${Math.random().toString(36).slice(2, 10)}`;
  const list: LeadList = {
    id,
    name,
    created_at: now,
    updated_at: now,
    person_ids: Array.from(new Set(personIds)),
  };
  const lists = safeRead();
  lists.push(list);
  safeWrite(lists);
  return list;
}

export function addToList(id: string, personIds: string[]): LeadList | null {
  const lists = safeRead();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const next = new Set([...lists[idx].person_ids, ...personIds]);
  lists[idx] = {
    ...lists[idx],
    person_ids: Array.from(next),
    updated_at: new Date().toISOString(),
  };
  safeWrite(lists);
  return lists[idx];
}

export function removeFromList(id: string, personIds: string[]): LeadList | null {
  const lists = safeRead();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const remove = new Set(personIds);
  lists[idx] = {
    ...lists[idx],
    person_ids: lists[idx].person_ids.filter((p) => !remove.has(p)),
    updated_at: new Date().toISOString(),
  };
  safeWrite(lists);
  return lists[idx];
}

export function deleteList(id: string): void {
  safeWrite(safeRead().filter((l) => l.id !== id));
}

export function renameList(id: string, name: string): LeadList | null {
  const lists = safeRead();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  lists[idx] = { ...lists[idx], name, updated_at: new Date().toISOString() };
  safeWrite(lists);
  return lists[idx];
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Cross-tab updates via the storage event.
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) fn(safeRead());
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
