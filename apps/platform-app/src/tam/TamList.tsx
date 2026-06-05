/**
 * TAM list route — `/tam`. Composition root for person-grain lead
 * search: filter sidebar + table + pagination + multi-select with
 * save-to-list. State is local; the BFF is the source of truth
 * (currently fixture-backed in api.ts). Lead lists persist in
 * localStorage via @/lib/leadLists.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { FilterBar } from "./FilterBar";
import { SaveToListDialog } from "./SaveToListDialog";
import { TamTable } from "./TamTable";
import { type TamRow, type TamSearchFilters, searchTam } from "./api";
import { PAGE_SIZES } from "./constants";

export default function TamList() {
  const { session, signOut } = useAuth();
  const [filters, setFilters] = useState<TamSearchFilters>({});
  const [pageSize, setPageSize] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  const [rows, setRows] = useState<TamRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveOpen, setSaveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    searchTam({ ...filters, limit: pageSize, offset })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setTotal(res.total_matched);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "search failed");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, pageSize, offset]);

  const handleApply = useCallback((next: TamSearchFilters) => {
    setOffset(0);
    setFilters(next);
  }, []);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const selectedCount = selected.size;

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              TAM
            </Text>
            <Text size="body-sm" color="muted">
              Lead list builder — filter people by title, seniority, function, and company
              firmographics.
            </Text>
          </Stack>
          <Inline gap="3" align="center">
            <Link to="/lists">
              <Button variant="ghost" size="sm">
                Lists
              </Button>
            </Link>
            <Text size="body-xs" color="muted" mono>
              {session?.user.email}
            </Text>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Inline>
        </Inline>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside>
            <FilterBar initial={filters} onApply={handleApply} />
          </aside>
          <Stack gap="4">
            <Inline justify="between" align="center">
              <Inline gap="3" align="center">
                <Text size="body-sm" color="muted">
                  {loading ? "Loading…" : `${total.toLocaleString()} matched`}
                </Text>
                {selectedCount > 0 && (
                  <>
                    <Text size="body-sm" color="muted">
                      ·
                    </Text>
                    <Text size="body-sm">{selectedCount} selected</Text>
                    <Button size="sm" onClick={() => setSaveOpen(true)}>
                      Save to list
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                      Clear
                    </Button>
                  </>
                )}
              </Inline>
              <Inline gap="4" align="center">
                <label className="flex items-center gap-2 text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Page size
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setOffset(0);
                    }}
                    className="h-8 rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-2 text-body-sm text-[color:var(--color-text-strong)]"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <Inline gap="2" align="center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - pageSize))}
                  >
                    Prev
                  </Button>
                  <Text size="body-xs" color="muted" mono>
                    {page} / {totalPages}
                  </Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={offset + pageSize >= total}
                    onClick={() => setOffset(offset + pageSize)}
                  >
                    Next
                  </Button>
                </Inline>
              </Inline>
            </Inline>

            {toast && (
              <Text size="body-sm" color="accent">
                {toast}
              </Text>
            )}

            {err && (
              <Text size="body-sm" className="text-[color:var(--color-state-error)]">
                {err}
              </Text>
            )}

            <TamTable
              rows={rows}
              loading={loading}
              selected={selected}
              onSelectionChange={setSelected}
            />
          </Stack>
        </div>
      </Stack>

      <SaveToListDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        personIds={Array.from(selected)}
        onSaved={(list) => {
          setToast(`Saved ${selected.size} to "${list.name}".`);
          setSelected(new Set());
          setTimeout(() => setToast(null), 3500);
        }}
      />
    </Page>
  );
}
