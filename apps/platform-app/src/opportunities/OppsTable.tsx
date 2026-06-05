/**
 * Opportunities table — list view. Each row is a button to the
 * detail route. Posted-date order is enforced server-side
 * (data-engine-x `search_opps` returns posted_date DESC).
 */
import { useNavigate } from "react-router-dom";

import type { OppRow } from "@/lib/api";
import { Badge, Box, Text } from "@rare-structure-hq/ui";

interface OppsTableProps {
  rows: OppRow[];
  loading: boolean;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  // The Lance dataset stores ISO date strings; truncate to YYYY-MM-DD for display.
  return d.length >= 10 ? d.slice(0, 10) : d;
}

function truncate(s: string | null, n: number): string {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function OppsTable({ rows, loading }: OppsTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box border="subtle" p="6" rounded="xl">
        <Text size="body-sm" color="muted">
          Loading opportunities…
        </Text>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box border="subtle" p="6" rounded="xl">
        <Text size="body-sm" color="muted">
          No opportunities match the current filters.
        </Text>
      </Box>
    );
  }

  return (
    <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
            <th className="px-3 py-2 font-normal">Posted</th>
            <th className="px-3 py-2 font-normal">Type</th>
            <th className="px-3 py-2 font-normal">NAICS</th>
            <th className="px-3 py-2 font-normal">Department</th>
            <th className="px-3 py-2 font-normal">Set-aside</th>
            <th className="px-3 py-2 font-normal">PoP State</th>
            <th className="px-3 py-2 font-normal">Title</th>
            <th className="px-3 py-2 font-normal">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: pre-existing click-to-navigate row; adding a row-level keyboard handler would change runtime behavior (out of scope for this lint-debt sweep).
            <tr
              key={r.notice_id}
              onClick={() => navigate(`/opportunities/${r.notice_id}`)}
              className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
            >
              <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                {fmtDate(r.posted_date)}
              </td>
              <td className="px-3 py-2">
                <Badge tone="default">{r.notice_type ?? "—"}</Badge>
              </td>
              <td className="px-3 py-2 font-mono text-mono-xs">{r.naics_code ?? "—"}</td>
              <td className="px-3 py-2 text-[color:var(--color-text-default)]">
                {truncate(r.department_agency, 28)}
              </td>
              <td className="px-3 py-2 font-mono text-mono-xs">{r.set_aside_code ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-mono-xs">{r.pop_state ?? "—"}</td>
              <td className="px-3 py-2 text-[color:var(--color-text-strong)]">
                {truncate(r.title, 70)}
              </td>
              <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                {fmtDate(r.response_deadline)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}
