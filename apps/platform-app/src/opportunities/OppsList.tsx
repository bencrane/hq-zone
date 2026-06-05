/**
 * Opportunities list route — `/opportunities`. The composition root
 * for the filter bar + table + pagination on the SAM.gov active
 * opportunities surface. State is local; the BFF is the source of
 * truth.
 */
import { useCallback, useEffect, useState } from "react";

import { type OppRow, type SearchFilters, searchOpps } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { FilterBar } from "./FilterBar";
import { OppsTable } from "./OppsTable";
import { PAGE_SIZES } from "./constants";

export default function OppsList() {
  const { session, signOut } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [pageSize, setPageSize] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  const [rows, setRows] = useState<OppRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    searchOpps({ ...filters, limit: pageSize, offset })
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

  // Stable callback so FilterBar's debounce can use it as a dep-list
  // exclusion without spinning.
  const handleApply = useCallback((next: SearchFilters) => {
    setOffset(0);
    setFilters(next);
  }, []);

  const page = Math.floor(offset / pageSize) + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Active opportunities
            </Text>
            <Text size="body-sm" color="muted">
              SAM.gov contract opportunities — refreshed daily.
            </Text>
          </Stack>
          <Inline gap="3" align="center">
            <Text size="body-xs" color="muted" mono>
              {session?.user.email}
            </Text>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Inline>
        </Inline>

        <FilterBar initial={filters} onApply={handleApply} />

        <Inline justify="between" align="center">
          <Text size="body-sm" color="muted">
            {loading ? "Loading…" : `${total.toLocaleString()} matched`}
          </Text>
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

        {err && (
          <Text size="body-sm" className="text-[color:var(--color-state-error)]">
            {err}
          </Text>
        )}

        <OppsTable rows={rows} loading={loading} />
      </Stack>
    </Page>
  );
}
