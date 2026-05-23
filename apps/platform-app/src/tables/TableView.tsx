/**
 * Table view — `/tables/:table_id`. Clay-shape grid: rows × columns,
 * "+ column" header affordance, per-cell status pills. Subscribes to
 * the tables store so cells fill in live as recipe runs complete.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, X } from "lucide-react";

import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  deleteTable,
  getTable,
  removeColumn,
  removeRows,
  subscribe,
  type Cell,
  type Column,
  type Row,
  type Table,
} from "@/lib/tables";
import { getWorkbook } from "@/lib/workbooks";
import { AddColumnDialog } from "./AddColumnDialog";
import { FindPeopleDialog } from "./FindPeopleDialog";

function renderCell(cell: Cell | undefined, column: Column): React.ReactNode {
  if (!cell || cell.status === "empty") {
    return <span className="text-white/30">—</span>;
  }
  if (cell.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-white/40">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">pending</span>
      </span>
    );
  }
  if (cell.status === "error") {
    return (
      <span
        title={cell.error ?? "error"}
        className="inline-flex items-center gap-1.5 text-red-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="text-xs">error</span>
      </span>
    );
  }
  // success
  const v = cell.value;
  if (v === null || v === undefined) return <span className="text-white/30">—</span>;
  if (column.data_type === "url" && typeof v === "string") {
    return (
      <a
        href={v.startsWith("http") ? v : `https://${v}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-white/85 underline-offset-2 hover:underline"
      >
        {v}
      </a>
    );
  }
  if (column.data_type === "email" && typeof v === "string") {
    return (
      <a
        href={`mailto:${v}`}
        onClick={(e) => e.stopPropagation()}
        className="text-white/85 underline-offset-2 hover:underline"
      >
        {v}
      </a>
    );
  }
  if (typeof v === "number") {
    return <span className="font-mono text-white/85">{v.toLocaleString()}</span>;
  }
  return <span className="text-white/85">{String(v)}</span>;
}

export default function TableView() {
  const { table_id: tableId } = useParams<{ table_id: string }>();
  const navigate = useNavigate();
  const [table, setTable] = useState<Table | null>(() => (tableId ? getTable(tableId) : null));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addColOpen, setAddColOpen] = useState(false);
  const [findPeopleOpen, setFindPeopleOpen] = useState(false);

  useEffect(() => {
    if (!tableId) return;
    return subscribe(() => setTable(getTable(tableId)));
  }, [tableId]);

  if (!table) {
    return (
      <Page variant="wide">
        <Stack gap="4">
          <Link to="/workbooks">
            <Button variant="ghost" size="sm">
              ← Back to workbooks
            </Button>
          </Link>
          <Text size="body-sm" color="muted">
            Table not found.
          </Text>
        </Stack>
      </Page>
    );
  }

  const workbook = getWorkbook(table.workbook_id);

  function toggleAllRows(next: boolean | "indeterminate") {
    if (next === true) setSelected(new Set(table!.rows.map((r) => r.id)));
    else setSelected(new Set());
  }
  function toggleRow(id: string, next: boolean | "indeterminate") {
    const copy = new Set(selected);
    if (next === true) copy.add(id);
    else copy.delete(id);
    setSelected(copy);
  }

  function handleRemoveSelected() {
    if (selected.size === 0) return;
    removeRows(table!.id, Array.from(selected));
    setSelected(new Set());
  }

  function handleDeleteColumn(columnId: string, columnName: string) {
    if (!confirm(`Remove column "${columnName}"? Enrichment data in this column is lost.`)) return;
    removeColumn(table!.id, columnId);
  }

  function handleDeleteTable() {
    if (!confirm(`Delete table "${table!.name}"? This can't be undone.`)) return;
    deleteTable(table!.id);
    navigate(workbook ? `/workbooks/${workbook.id}` : "/workbooks");
  }

  const headerState: boolean | "indeterminate" =
    selected.size === 0
      ? false
      : selected.size === table.rows.length
      ? true
      : "indeterminate";

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Inline gap="3" align="center">
            <Link
              to={workbook ? `/workbooks/${workbook.id}` : "/workbooks"}
            >
              <Button variant="ghost" size="sm">
                ← {workbook ? workbook.name : "Workbooks"}
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Link to="/workbooks" className="hover:text-white/80">
                Workbooks
              </Link>
              {workbook && (
                <>
                  <span className="text-white/30">/</span>
                  <Link
                    to={`/workbooks/${workbook.id}`}
                    className="hover:text-white/80"
                  >
                    {workbook.name}
                  </Link>
                </>
              )}
              <span className="text-white/30">/</span>
              <span className="text-white">{table.name}</span>
            </div>
          </Inline>
          <Inline gap="2" align="center">
            {table.kind === "companies" && (
              <Button size="sm" onClick={() => setFindPeopleOpen(true)}>
                Find people
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setAddColOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Column
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeleteTable}>
              Delete
            </Button>
          </Inline>
        </Inline>

        <Stack gap="2">
          <Inline gap="3" align="center">
            <Text as="h1" size="display-sm">
              {table.name}
            </Text>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs uppercase tracking-wide text-white/60">
              {table.kind}
            </span>
          </Inline>
          <Text size="body-sm" color="muted">
            {table.rows.length} {table.rows.length === 1 ? "row" : "rows"} ·{" "}
            {table.columns.length} {table.columns.length === 1 ? "column" : "columns"}
          </Text>
        </Stack>

        {selected.size > 0 && (
          <Inline gap="3" align="center">
            <Text size="body-sm">{selected.size} selected</Text>
            <Button size="sm" variant="secondary" onClick={handleRemoveSelected}>
              Remove rows
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </Inline>
        )}

        {table.rows.length === 0 ? (
          <Box border="subtle" p="6" rounded="xl">
            <Text size="body-sm" color="muted">
              Empty table. Add rows from "Find Companies" or "Find People".
            </Text>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left">
                  <th className="px-3 py-2" style={{ width: 40 }}>
                    <Checkbox
                      checked={headerState}
                      onCheckedChange={toggleAllRows}
                      aria-label="Select all rows"
                    />
                  </th>
                  {table.columns.map((c) => (
                    <th
                      key={c.id}
                      className="group whitespace-nowrap px-3 py-2 font-normal text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.kind === "enrichment" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(c.id, c.name)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            title="Remove column"
                          >
                            <X className="h-3 w-3 text-white/40 hover:text-white" />
                          </button>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setAddColOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/20 px-2 py-1 text-xs text-white/60 hover:border-white/40 hover:text-white"
                      title="Add column"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <TableRowView
                    key={r.id}
                    row={r}
                    columns={table.columns}
                    isSelected={selected.has(r.id)}
                    onToggle={(next) => toggleRow(r.id, next)}
                  />
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Stack>

      <AddColumnDialog
        open={addColOpen}
        onOpenChange={setAddColOpen}
        table={table}
      />
      {table.kind === "companies" && (
        <FindPeopleDialog
          open={findPeopleOpen}
          onOpenChange={setFindPeopleOpen}
          companiesTable={table}
        />
      )}
    </Page>
  );
}

interface TableRowViewProps {
  row: Row;
  columns: Column[];
  isSelected: boolean;
  onToggle: (next: boolean | "indeterminate") => void;
}

function TableRowView({ row, columns, isSelected, onToggle }: TableRowViewProps) {
  return (
    <tr className="border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]">
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label="Select row" />
      </td>
      {columns.map((c) => (
        <td key={c.id} className="whitespace-nowrap px-3 py-2">
          {renderCell(row.cells[c.id], c)}
        </td>
      ))}
      <td />
    </tr>
  );
}
