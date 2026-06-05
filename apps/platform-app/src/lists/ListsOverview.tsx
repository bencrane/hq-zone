/**
 * Lead lists overview — `/lists`. Shows all saved lead lists with
 * member count + last-updated. Click into a list to see members and
 * hand off to campaigns.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { type LeadList, listLists, subscribe } from "@/lib/leadLists";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

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

export default function ListsOverview() {
  const [lists, setLists] = useState<LeadList[]>(() => listLists());
  const navigate = useNavigate();

  useEffect(() => subscribe(setLists), []);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Lead lists
            </Text>
            <Text size="body-sm" color="muted">
              Saved bags of people. Drive campaigns from here.
            </Text>
          </Stack>
          <Inline gap="3" align="center">
            <Link to="/tam">
              <Button size="sm">Build a list</Button>
            </Link>
          </Inline>
        </Inline>

        {lists.length === 0 ? (
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">No lead lists yet.</Text>
              <Text size="body-sm" color="muted">
                Head to TAM, filter people, select rows, and save them to a list.
              </Text>
              <Link to="/tam">
                <Button size="sm">Build your first list</Button>
              </Link>
            </Stack>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">People</th>
                  <th className="px-3 py-2 font-normal">Updated</th>
                  <th className="px-3 py-2 font-normal">Created</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: pre-existing click-to-navigate row; adding a row-level keyboard handler would change runtime behavior (out of scope for this lint-debt sweep).
                  <tr
                    key={l.id}
                    onClick={() => navigate(`/lists/${l.id}`)}
                    className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)]"
                  >
                    <td className="px-3 py-2 text-[color:var(--color-text-strong)]">{l.name}</td>
                    <td className="px-3 py-2 font-mono text-mono-xs">{l.person_ids.length}</td>
                    <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                      {fmtDate(l.updated_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
                      {fmtDate(l.created_at)}
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
