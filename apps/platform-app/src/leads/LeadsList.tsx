import { Loader2 } from "lucide-react";
/**
 * Leads list — `/leads`. Read-only view over gtm.people through
 * platform-api -> hq-x. Source dropdown + free-text search + offset
 * pagination.
 *
 * Intentionally minimal: no row selection, no workbook integration,
 * no enrichment. Designed to answer "show me my leads" first; richer
 * affordances (push to workbook, run waterfall, etc.) come next.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { type LeadRow, listLeads } from "./api";

const PAGE_SIZE = 50;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function LeadsList() {
  const [source, setSource] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // Sources are derived from row payloads — every row carries its own
  // `source` value. We accumulate the set across fetches so the dropdown
  // grows as the user pages through unfiltered data.
  const [sources, setSources] = useState<Set<string>>(new Set());

  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    listLeads({
      source: source || undefined,
      q: debouncedQ || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
        setSources((prev) => {
          const next = new Set(prev);
          for (const r of res.data) if (r.source) next.add(r.source);
          return next.size === prev.size ? prev : next;
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "list failed");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, debouncedQ, offset]);

  const handleSourceChange = useCallback((next: string) => {
    setOffset(0);
    setSource(next);
  }, []);

  const handleQueryChange = useCallback((next: string) => {
    setOffset(0);
    setQ(next);
  }, []);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shownStart = total === 0 ? 0 : offset + 1;
  const shownEnd = Math.min(total, offset + rows.length);

  const showing = useMemo(
    () =>
      total === 0
        ? "0 leads"
        : `${shownStart.toLocaleString()}–${shownEnd.toLocaleString()} of ${total.toLocaleString()}`,
    [total, shownStart, shownEnd],
  );

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Inline gap="3" align="center">
            <Link to="/">
              <Button variant="ghost" size="sm">
                ← HQ
              </Button>
            </Link>
            <Text size="body-sm" color="muted">
              gtm.people
            </Text>
          </Inline>
          <Text size="body-sm" color="muted">
            {showing}
          </Text>
        </Inline>

        <Stack gap="2">
          <Text as="h1" size="display-sm">
            Leads
          </Text>
          <Text size="body-sm" color="muted">
            Read-only view over the canonical people table in gtm.
          </Text>
        </Stack>

        <Inline gap="3" align="center">
          <div className="flex items-center gap-2">
            <label htmlFor="leads-source" className="text-xs uppercase tracking-wide text-white/50">
              Source
            </label>
            <select
              id="leads-source"
              value={source}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="h-8 rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="">All sources</option>
              {[...sources].sort().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="leads-search" className="text-xs uppercase tracking-wide text-white/50">
              Search
            </label>
            <input
              id="leads-search"
              value={q}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="name or title contains…"
              className="h-8 w-72 rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            />
          </div>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}
        </Inline>

        {err ? (
          <Box border="subtle" p="6" rounded="xl">
            <Text size="body-sm" color="muted">
              <span className="text-red-400">{err}</span>
            </Text>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left">
                  <Th>Name</Th>
                  <Th>Title</Th>
                  <Th>Company</Th>
                  <Th>Source</Th>
                  <Th>LinkedIn</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12 text-center text-white/40">
                      No leads match.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => <LeadRowView key={r.id} row={r} />)
                )}
              </tbody>
            </table>
          </Box>
        )}

        <Inline justify="between" align="center">
          <Text size="body-sm" color="muted">
            Page {page} of {totalPages}
          </Text>
          <Inline gap="2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0 || loading}
            >
              ← Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + rows.length >= total || loading}
            >
              Next →
            </Button>
          </Inline>
        </Inline>
      </Stack>
    </Page>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2 font-normal text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
      {children}
    </th>
  );
}

function LeadRowView({ row }: { row: LeadRow }) {
  return (
    <tr className="border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]">
      <td className="whitespace-nowrap px-3 py-2 text-white/85">{row.full_name ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-white/70">{row.title ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-white/70">
        {row.company_name ?? "—"}
        {row.company_domain ? (
          <span className="ml-2 text-xs text-white/40">{row.company_domain}</span>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-mono-xs text-white/60">
        {row.source ?? "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        {row.company_linkedin_url ? (
          <a
            href={
              row.company_linkedin_url.startsWith("http")
                ? row.company_linkedin_url
                : `https://${row.company_linkedin_url}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/85 underline-offset-2 hover:underline"
          >
            company
          </a>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </td>
    </tr>
  );
}
