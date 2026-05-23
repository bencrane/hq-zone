/**
 * TAM table — person-grain lead list. Each row is a person at a
 * company. Clicking the row navigates to /tam/:person_id; clicking
 * the row's checkbox toggles selection without navigating.
 */
import { useNavigate } from "react-router-dom";

import { Box, Text } from "@rare-structure-hq/ui";
import { Checkbox } from "@/components/ui/checkbox";
import type { TamRow } from "./api";
import { EMPLOYEE_BANDS, SENIORITY_BANDS } from "./constants";

interface TamTableProps {
  rows: TamRow[];
  loading: boolean;
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

const seniorityLabel = new Map(SENIORITY_BANDS.map((b) => [b.value, b.label]));
const employeeLabel = new Map(EMPLOYEE_BANDS.map((b) => [b.value, b.label]));

function truncate(s: string | null, n: number): string {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function TamTable({
  rows,
  loading,
  selected,
  onSelectionChange,
}: TamTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box border="subtle" p="6" rounded="xl">
        <Text size="body-sm" color="muted">
          Loading leads…
        </Text>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box border="subtle" p="6" rounded="xl">
        <Text size="body-sm" color="muted">
          No people match the current filters.
        </Text>
      </Box>
    );
  }

  const pageIds = rows.map((r) => r.person_id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const headerState: boolean | "indeterminate" =
    selectedOnPage === 0
      ? false
      : selectedOnPage === pageIds.length
      ? true
      : "indeterminate";

  function toggleAll(next: boolean | "indeterminate") {
    const copy = new Set(selected);
    if (next === true) {
      pageIds.forEach((id) => copy.add(id));
    } else {
      pageIds.forEach((id) => copy.delete(id));
    }
    onSelectionChange(copy);
  }

  function toggleOne(id: string, next: boolean | "indeterminate") {
    const copy = new Set(selected);
    if (next === true) copy.add(id);
    else copy.delete(id);
    onSelectionChange(copy);
  }

  return (
    <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
            <th className="px-3 py-2 font-normal" style={{ width: 40 }}>
              <Checkbox
                checked={headerState}
                onCheckedChange={toggleAll}
                aria-label="Select all on page"
              />
            </th>
            <th className="px-3 py-2 font-normal">Name</th>
            <th className="px-3 py-2 font-normal">Title</th>
            <th className="px-3 py-2 font-normal">Seniority</th>
            <th className="px-3 py-2 font-normal">Function</th>
            <th className="px-3 py-2 font-normal">Company</th>
            <th className="px-3 py-2 font-normal">Industry</th>
            <th className="px-3 py-2 font-normal">Employees</th>
            <th className="px-3 py-2 font-normal">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSelected = selected.has(r.person_id);
            return (
              <tr
                key={r.person_id}
                onClick={() => navigate(`/tam/${r.person_id}`)}
                className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
              >
                <td
                  className="px-3 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(v) => toggleOne(r.person_id, v)}
                    aria-label={`Select ${r.full_name}`}
                  />
                </td>
                <td className="px-3 py-2 text-[color:var(--color-text-strong)]">
                  {truncate(r.full_name, 28)}
                </td>
                <td className="px-3 py-2 text-[color:var(--color-text-default)]">
                  {truncate(r.title, 32)}
                </td>
                <td className="px-3 py-2 font-mono text-mono-xs">
                  {seniorityLabel.get(r.seniority_band) ?? r.seniority_band}
                </td>
                <td className="px-3 py-2 font-mono text-mono-xs">{r.function}</td>
                <td className="px-3 py-2 text-[color:var(--color-text-default)]">
                  {truncate(r.company_name, 26)}
                </td>
                <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                  {truncate(r.industry, 22)}
                </td>
                <td className="px-3 py-2 font-mono text-mono-xs">
                  {r.employee_band ? employeeLabel.get(r.employee_band) ?? r.employee_band : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                  {r.person_locality
                    ? `${r.person_locality}, ${r.person_state ?? "—"}`
                    : r.person_state ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
}
