/**
 * Workbooks index — `/workbooks`. Top-level entry point for the
 * Clay-shape product. Each workbook is a folder containing tables.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus } from "lucide-react";

import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import {
  createWorkbook,
  listWorkbooks,
  subscribe,
  type Workbook,
} from "@/lib/workbooks";
import { listTables } from "@/lib/tables";

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

export default function WorkbooksIndex() {
  const [workbooks, setWorkbooks] = useState<Workbook[]>(() => listWorkbooks());
  const navigate = useNavigate();

  useEffect(() => subscribe(setWorkbooks), []);

  // Table counts per workbook — recomputed when workbooks change.
  const tableCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of listTables()) {
      counts.set(t.workbook_id, (counts.get(t.workbook_id) ?? 0) + 1);
    }
    return counts;
  }, [workbooks]);

  function handleNewWorkbook() {
    const name = prompt("Name your workbook")?.trim();
    if (!name) return;
    const w = createWorkbook(name);
    navigate(`/workbooks/${w.id}`);
  }

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Workbooks
            </Text>
            <Text size="body-sm" color="muted">
              Clay-shape workspaces. Each workbook holds related tables — companies, the people from those companies, enrichment columns stacked on top.
            </Text>
          </Stack>
          <Button size="sm" onClick={handleNewWorkbook}>
            <Plus className="h-3.5 w-3.5" /> New workbook
          </Button>
        </Inline>

        {workbooks.length === 0 ? (
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">No workbooks yet.</Text>
              <Text size="body-sm" color="muted">
                A workbook is a container for related tables. Make one to start finding companies and stacking enrichments.
              </Text>
              <Button size="sm" onClick={handleNewWorkbook}>
                <Plus className="h-3.5 w-3.5" /> New workbook
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">Tables</th>
                  <th className="px-3 py-2 font-normal">Updated</th>
                  <th className="px-3 py-2 font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {workbooks.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => navigate(`/workbooks/${w.id}`)}
                    className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
                  >
                    <td className="px-3 py-2 text-[color:var(--color-text-strong)]">
                      <span className="inline-flex items-center gap-2">
                        <FolderOpen className="h-3.5 w-3.5 text-white/50" />
                        {w.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs">
                      {tableCounts.get(w.id) ?? 0}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                      {fmtDate(w.updated_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                      {fmtDate(w.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Stack>
    </Page>
  );
}
