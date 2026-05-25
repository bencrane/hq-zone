/**
 * Views overview — `/views`. Lists all defined materialized-view definitions
 * with title, description, compute count (cheap, on-demand), and materialized
 * row count + URI (Polaris-registered Lance dataset). Click into a view for
 * detail (criteria spec + compute + materialize triggers).
 *
 * Storage is in DEX (gtm.views), accessed via hq-x via the BFF passthrough.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { View } from "@rare-structure-hq/shared";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { listViews } from "./api";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
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

export default function ViewsList() {
  const [views, setViews] = useState<View[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listViews()
      .then(setViews)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Views
            </Text>
            <Text size="body-sm" color="muted">
              Materialized views over the data factory. Authored as criteria specs over Lance
              datasets — same spec, same query, every time. Materialize to emit a Lance dataset
              registered in Polaris, browseable + composable by other views.
            </Text>
          </Stack>
          <Inline gap="3" align="center">
            <Link to="/views/new">
              <Button size="sm">New view</Button>
            </Link>
          </Inline>
        </Inline>

        {error && (
          <Box border="subtle" p="4" unsafe_className="rounded-md">
            <Text size="body-sm" color="muted">
              Failed to load views: {error}
            </Text>
          </Box>
        )}

        {views === null && !error && (
          <Text size="body-sm" color="muted">
            Loading…
          </Text>
        )}

        {views !== null && views.length === 0 && (
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">No views yet.</Text>
              <Text size="body-sm" color="muted">
                Views are materialized cohorts you can re-run any time (e.g. "won a brand-new
                contract above $X in the past N days"). Define one to start.
              </Text>
              <Link to="/views/new">
                <Button size="sm">Define your first view</Button>
              </Link>
            </Stack>
          </Box>
        )}

        {views !== null && views.length > 0 && (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Title</th>
                  <th className="px-3 py-2 font-normal">Description</th>
                  <th className="px-3 py-2 font-normal">Grain</th>
                  <th className="px-3 py-2 font-normal">Count</th>
                  <th className="px-3 py-2 font-normal">Materialized rows</th>
                  <th className="px-3 py-2 font-normal">Last computed</th>
                  <th className="px-3 py-2 font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/views/${v.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") navigate(`/views/${v.id}`);
                    }}
                    tabIndex={0}
                    className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
                  >
                    <td className="px-3 py-2 font-medium">{v.title}</td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {v.description || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs">{v.entity_grain}</td>
                    <td className="px-3 py-2 font-mono text-mono-sm">
                      {v.computed_count === null ? "—" : v.computed_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-sm">
                      {v.row_count === null ? "—" : v.row_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {fmtDate(v.computed_at)}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {fmtDate(v.created_at)}
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
