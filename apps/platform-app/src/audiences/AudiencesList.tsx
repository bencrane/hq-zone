/**
 * Audiences overview — `/audiences`. Lists all defined audiences with
 * title, description, and last-computed member count. Click into an
 * audience for detail (criteria spec + recompute trigger).
 *
 * Storage is BFF-in-memory in v1, so the list resets on BFF restart.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { Audience } from "@rare-structure-hq/shared";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { listAudiences } from "./api";

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

export default function AudiencesList() {
  const [audiences, setAudiences] = useState<Audience[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listAudiences()
      .then(setAudiences)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Audiences
            </Text>
            <Text size="body-sm" color="muted">
              Deterministic cohorts over the data factory. Authored as criteria specs over Lance
              datasets — same spec, same query, every time.
            </Text>
          </Stack>
          <Inline gap="3" align="center">
            <Link to="/audiences/new">
              <Button size="sm">New audience</Button>
            </Link>
          </Inline>
        </Inline>

        {error && (
          <Box border="subtle" p="4" unsafe_className="rounded-md">
            <Text size="body-sm" color="muted">
              Failed to load audiences: {error}
            </Text>
          </Box>
        )}

        {audiences === null && !error && (
          <Text size="body-sm" color="muted">
            Loading…
          </Text>
        )}

        {audiences !== null && audiences.length === 0 && (
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">No audiences yet.</Text>
              <Text size="body-sm" color="muted">
                Audiences are deterministic cohorts you can re-run any time (e.g. "won a brand-new
                contract above $X in the past N days"). Define one to start.
              </Text>
              <Link to="/audiences/new">
                <Button size="sm">Define your first audience</Button>
              </Link>
            </Stack>
          </Box>
        )}

        {audiences !== null && audiences.length > 0 && (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Title</th>
                  <th className="px-3 py-2 font-normal">Description</th>
                  <th className="px-3 py-2 font-normal">Grain</th>
                  <th className="px-3 py-2 font-normal">Members</th>
                  <th className="px-3 py-2 font-normal">Computed</th>
                  <th className="px-3 py-2 font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {audiences.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/audiences/${a.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") navigate(`/audiences/${a.id}`);
                    }}
                    tabIndex={0}
                    className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
                  >
                    <td className="px-3 py-2 font-medium">{a.title}</td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {a.description || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs">{a.entity_grain}</td>
                    <td className="px-3 py-2 font-mono text-mono-sm">
                      {a.computed_count === null ? "—" : a.computed_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {fmtDate(a.computed_at)}
                    </td>
                    <td className="px-3 py-2 text-[color:var(--color-text-muted)]">
                      {fmtDate(a.created_at)}
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
