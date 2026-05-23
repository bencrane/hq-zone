/**
 * Workbook detail — `/workbooks/:workbook_id`. Lists the tables in
 * this workbook with quick actions. Entry point for "Find companies"
 * scoped to this workbook.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, Plus, Users } from "lucide-react";

import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import {
  deleteWorkbook,
  getWorkbook,
  renameWorkbook,
  subscribe as subscribeWorkbooks,
  type Workbook,
} from "@/lib/workbooks";
import {
  listTablesInWorkbook,
  subscribe as subscribeTables,
  type Table,
} from "@/lib/tables";

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WorkbookDetail() {
  const { workbook_id: workbookId } = useParams<{ workbook_id: string }>();
  const navigate = useNavigate();
  const [workbook, setWorkbook] = useState<Workbook | null>(() =>
    workbookId ? getWorkbook(workbookId) : null,
  );
  const [tables, setTables] = useState<Table[]>(() =>
    workbookId ? listTablesInWorkbook(workbookId) : [],
  );

  useEffect(() => {
    if (!workbookId) return;
    const u1 = subscribeWorkbooks(() => setWorkbook(getWorkbook(workbookId)));
    const u2 = subscribeTables(() => setTables(listTablesInWorkbook(workbookId)));
    return () => {
      u1();
      u2();
    };
  }, [workbookId]);

  const parentMap = useMemo(() => {
    const m = new Map<string, Table>();
    for (const t of tables) m.set(t.id, t);
    return m;
  }, [tables]);

  if (!workbook) {
    return (
      <Page variant="wide">
        <Stack gap="4">
          <Link to="/workbooks">
            <Button variant="ghost" size="sm">
              ← Back to workbooks
            </Button>
          </Link>
          <Text size="body-sm" color="muted">
            Workbook not found.
          </Text>
        </Stack>
      </Page>
    );
  }

  function handleRename() {
    const next = prompt("Rename workbook", workbook!.name)?.trim();
    if (!next || next === workbook!.name) return;
    renameWorkbook(workbook!.id, next);
  }

  function handleDelete() {
    if (tables.length > 0) {
      alert(
        `This workbook has ${tables.length} table${tables.length === 1 ? "" : "s"}. Delete or move them first.`,
      );
      return;
    }
    if (!confirm(`Delete workbook "${workbook!.name}"?`)) return;
    deleteWorkbook(workbook!.id);
    navigate("/workbooks");
  }

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Link to="/workbooks">
            <Button variant="ghost" size="sm">
              ← All workbooks
            </Button>
          </Link>
          <Inline gap="2" align="center">
            <Button
              size="sm"
              onClick={() => navigate(`/find/companies?workbook=${workbook.id}`)}
            >
              <Plus className="h-3.5 w-3.5" /> Find companies
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRename}>
              Rename
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          </Inline>
        </Inline>

        <Stack gap="2">
          <Text as="h1" size="display-sm">
            {workbook.name}
          </Text>
          <Text size="body-sm" color="muted">
            {tables.length} {tables.length === 1 ? "table" : "tables"} · created{" "}
            {fmtDate(workbook.created_at)}
          </Text>
        </Stack>

        {tables.length === 0 ? (
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">Empty workbook.</Text>
              <Text size="body-sm" color="muted">
                Find companies to seed your first table. From there, spawn a People table or stack enrichment columns.
              </Text>
              <Button
                size="sm"
                onClick={() => navigate(`/find/companies?workbook=${workbook.id}`)}
              >
                <Plus className="h-3.5 w-3.5" /> Find companies
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">Kind</th>
                  <th className="px-3 py-2 font-normal">Rows</th>
                  <th className="px-3 py-2 font-normal">Columns</th>
                  <th className="px-3 py-2 font-normal">Updated</th>
                  <th className="px-3 py-2 font-normal">Source</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const parent = t.parent_table_id ? parentMap.get(t.parent_table_id) : null;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tables/${t.id}`)}
                      className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
                    >
                      <td className="px-3 py-2 text-[color:var(--color-text-strong)]">
                        {t.name}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-white/70">
                          {t.kind === "companies" ? (
                            <Building2 className="h-3.5 w-3.5" />
                          ) : (
                            <Users className="h-3.5 w-3.5" />
                          )}
                          <span className="text-xs uppercase tracking-wide">{t.kind}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-mono-xs">{t.rows.length}</td>
                      <td className="px-3 py-2 font-mono text-mono-xs">{t.columns.length}</td>
                      <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                        {fmtDate(t.updated_at)}
                      </td>
                      <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                        {parent ? (
                          <span className="text-xs">↳ from {parent.name}</span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Stack>
    </Page>
  );
}
