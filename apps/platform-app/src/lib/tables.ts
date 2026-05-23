/**
 * Tables — Clay-shape data layer. A table has rows (companies or people)
 * and columns. Columns are either native (sourced from the row's origin
 * dataset) or enrichment (filled by running a recipe per-row).
 *
 * Currently localStorage-backed for product-experience iteration. The
 * real home is hq-x's gtm-initiatives schema; swap-out is one module.
 *
 * Storage shape:
 *   localStorage["hq:tables"] = JSON.stringify(Table[])
 */

const STORAGE_KEY = "hq:tables";

export type TableKind = "companies" | "people";
export type CellValue = string | number | boolean | null;
export type CellStatus = "empty" | "pending" | "success" | "error";

export interface Column {
  id: string;
  name: string;
  /** native = sourced from the row's origin dataset; enrichment = recipe-filled. */
  kind: "native" | "enrichment";
  /** For enrichment columns: which recipe produces this column. */
  recipe_id?: string;
  /** Display hint (text, number, url, email, etc). */
  data_type?: "text" | "number" | "url" | "email" | "date" | "boolean";
}

export interface Cell {
  value: CellValue;
  status: CellStatus;
  enriched_at?: string;
  provider?: string;
  error?: string;
}

export interface Row {
  id: string;
  /** Link back to source: pdl_id for companies, person_id for people. */
  source_id: string;
  /** For People tables: which company_id this person belongs to (links People → Companies). */
  parent_company_id?: string;
  /** Cells keyed by column_id. */
  cells: Record<string, Cell>;
}

export interface Table {
  id: string;
  /** Required after the Workbooks migration. Tables always live inside a workbook. */
  workbook_id: string;
  name: string;
  kind: TableKind;
  created_at: string;
  updated_at: string;
  /** For People tables spawned from a Companies table. */
  parent_table_id?: string;
  columns: Column[];
  rows: Row[];
}

type Listener = (tables: Table[]) => void;
const listeners = new Set<Listener>();

function safeRead(): Table[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(tables: Table[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  for (const l of listeners) l(tables);
}

function shortId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────── reads ─────────────

export function listTables(): Table[] {
  return safeRead().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function listTablesInWorkbook(workbookId: string): Table[] {
  return listTables().filter((t) => t.workbook_id === workbookId);
}

export function getTable(id: string): Table | null {
  return safeRead().find((t) => t.id === id) ?? null;
}

// ───────────── table mutations ─────────────

export function createTable(args: {
  workbook_id: string;
  name: string;
  kind: TableKind;
  columns: Column[];
  rows: Row[];
  parent_table_id?: string;
}): Table {
  const now = new Date().toISOString();
  const t: Table = {
    id: shortId("T"),
    workbook_id: args.workbook_id,
    name: args.name,
    kind: args.kind,
    created_at: now,
    updated_at: now,
    parent_table_id: args.parent_table_id,
    columns: args.columns,
    rows: args.rows,
  };
  const tables = safeRead();
  tables.push(t);
  safeWrite(tables);
  return t;
}

/**
 * One-time migration: tables created before workbooks landed have no
 * workbook_id. Sweep them into the given workbook on first load.
 * Idempotent: tables already assigned are left alone.
 */
export function migrateOrphanTables(intoWorkbookId: string): number {
  const tables = safeRead();
  let migrated = 0;
  for (let i = 0; i < tables.length; i++) {
    if (!tables[i].workbook_id) {
      tables[i] = { ...tables[i], workbook_id: intoWorkbookId };
      migrated++;
    }
  }
  if (migrated > 0) safeWrite(tables);
  return migrated;
}

export function renameTable(id: string, name: string): Table | null {
  return updateTable(id, (t) => ({ ...t, name, updated_at: new Date().toISOString() }));
}

export function deleteTable(id: string): void {
  safeWrite(safeRead().filter((t) => t.id !== id));
}

// ───────────── row mutations ─────────────

export function addRows(tableId: string, rows: Row[]): Table | null {
  return updateTable(tableId, (t) => {
    const existing = new Set(t.rows.map((r) => r.source_id));
    const fresh = rows.filter((r) => !existing.has(r.source_id));
    return {
      ...t,
      rows: [...t.rows, ...fresh],
      updated_at: new Date().toISOString(),
    };
  });
}

export function removeRows(tableId: string, rowIds: string[]): Table | null {
  const drop = new Set(rowIds);
  return updateTable(tableId, (t) => ({
    ...t,
    rows: t.rows.filter((r) => !drop.has(r.id)),
    updated_at: new Date().toISOString(),
  }));
}

// ───────────── column mutations ─────────────

export function addColumn(tableId: string, column: Column): Table | null {
  return updateTable(tableId, (t) => {
    if (t.columns.find((c) => c.id === column.id)) return t;
    return {
      ...t,
      columns: [...t.columns, column],
      updated_at: new Date().toISOString(),
    };
  });
}

export function removeColumn(tableId: string, columnId: string): Table | null {
  return updateTable(tableId, (t) => ({
    ...t,
    columns: t.columns.filter((c) => c.id !== columnId),
    rows: t.rows.map((r) => {
      const { [columnId]: _, ...rest } = r.cells;
      return { ...r, cells: rest };
    }),
    updated_at: new Date().toISOString(),
  }));
}

// ───────────── cell mutations ─────────────

export function setCell(
  tableId: string,
  rowId: string,
  columnId: string,
  cell: Cell,
): Table | null {
  return updateTable(tableId, (t) => ({
    ...t,
    rows: t.rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: cell } } : r,
    ),
    updated_at: new Date().toISOString(),
  }));
}

export function setCellsBatch(
  tableId: string,
  updates: { rowId: string; columnId: string; cell: Cell }[],
): Table | null {
  if (updates.length === 0) return getTable(tableId);
  return updateTable(tableId, (t) => {
    const byRow = new Map<string, { columnId: string; cell: Cell }[]>();
    for (const u of updates) {
      if (!byRow.has(u.rowId)) byRow.set(u.rowId, []);
      byRow.get(u.rowId)!.push({ columnId: u.columnId, cell: u.cell });
    }
    return {
      ...t,
      rows: t.rows.map((r) => {
        const ups = byRow.get(r.id);
        if (!ups) return r;
        const cells = { ...r.cells };
        for (const { columnId, cell } of ups) cells[columnId] = cell;
        return { ...r, cells };
      }),
      updated_at: new Date().toISOString(),
    };
  });
}

// ───────────── plumbing ─────────────

function updateTable(id: string, fn: (t: Table) => Table): Table | null {
  const tables = safeRead();
  const idx = tables.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  tables[idx] = fn(tables[idx]);
  safeWrite(tables);
  return tables[idx];
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

// ───────────── helpers for callers ─────────────

export function newRowId(): string {
  return shortId("R");
}

export function newColumnId(): string {
  return shortId("C");
}

export function newCellEmpty(): Cell {
  return { value: null, status: "empty" };
}
