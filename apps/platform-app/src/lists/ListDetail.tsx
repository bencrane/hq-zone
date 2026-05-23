/**
 * Lead list detail — `/lists/:list_id`. Shows members of one list,
 * supports remove-from-list, delete-list, and "Send to campaign"
 * which enrolls the list into a new hq-x campaign via the platform-api
 * orchestrator.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  deleteList,
  getList,
  removeFromList,
  subscribe,
  type LeadList,
} from "@/lib/leadLists";
import { TAM_FIXTURE } from "@/tam/fixture";
import { EMPLOYEE_BANDS, SENIORITY_BANDS } from "@/tam/constants";
import { SendToCampaignDialog } from "@/campaigns/SendToCampaignDialog";
import type { EnrollRecipientInput } from "@/campaigns/api";

const seniorityLabel = new Map(SENIORITY_BANDS.map((b) => [b.value, b.label]));
const employeeLabel = new Map(EMPLOYEE_BANDS.map((b) => [b.value, b.label]));

function truncate(s: string | null, n: number): string {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function ListDetail() {
  const { list_id: listId } = useParams<{ list_id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<LeadList | null>(() =>
    listId ? getList(listId) : null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    if (!listId) return;
    return subscribe(() => setList(getList(listId)));
  }, [listId]);

  // Resolve person_ids → fixture rows. When this surface moves to a
  // real BFF, swap to a getPeopleByIds(...) bulk fetch.
  const members = useMemo(() => {
    if (!list) return [];
    const idx = new Map(TAM_FIXTURE.map((r) => [r.person_id, r]));
    return list.person_ids.map((id) => idx.get(id)).filter(Boolean) as typeof TAM_FIXTURE;
  }, [list]);

  const enrollRecipients: EnrollRecipientInput[] = useMemo(
    () =>
      members.map((m) => ({
        external_source: "hq_zone.tam_fixture",
        external_id: m.person_id,
        display_name: m.full_name,
        email: m.email,
        person_state: m.person_state,
        person_locality: m.person_locality,
        metadata: {
          title: m.title,
          seniority_band: m.seniority_band,
          function: m.function,
          company_name: m.company_name,
          company_id: m.company_id,
          industry: m.industry,
        },
      })),
    [members],
  );

  if (!list) {
    return (
      <Page variant="wide">
        <Stack gap="4">
          <Link to="/lists">
            <Button variant="ghost" size="sm">
              ← Back to lists
            </Button>
          </Link>
          <Text size="body-sm" color="muted">
            List not found.
          </Text>
        </Stack>
      </Page>
    );
  }

  function toggleOne(id: string, next: boolean | "indeterminate") {
    const copy = new Set(selected);
    if (next === true) copy.add(id);
    else copy.delete(id);
    setSelected(copy);
  }

  function toggleAll(next: boolean | "indeterminate") {
    if (next === true) setSelected(new Set(members.map((m) => m.person_id)));
    else setSelected(new Set());
  }

  function handleRemove() {
    if (!list || selected.size === 0) return;
    removeFromList(list.id, Array.from(selected));
    setSelected(new Set());
    setToast(`Removed ${selected.size}.`);
    setTimeout(() => setToast(null), 3500);
  }

  function handleDelete() {
    if (!list) return;
    if (!confirm(`Delete list "${list.name}"? This can't be undone.`)) return;
    deleteList(list.id);
    navigate("/lists");
  }

  const headerState: boolean | "indeterminate" =
    selected.size === 0
      ? false
      : selected.size === members.length
      ? true
      : "indeterminate";

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Inline gap="3" align="center">
            <Link to="/lists">
              <Button variant="ghost" size="sm">
                ← All lists
              </Button>
            </Link>
          </Inline>
          <Inline gap="2" align="center">
            <Button
              size="sm"
              onClick={() => setSendOpen(true)}
              disabled={members.length === 0}
            >
              Send to campaign
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              Delete list
            </Button>
          </Inline>
        </Inline>

        <Stack gap="2">
          <Text as="h1" size="display-sm">
            {list.name}
          </Text>
          <Text size="body-sm" color="muted">
            {list.person_ids.length} {list.person_ids.length === 1 ? "person" : "people"}
          </Text>
        </Stack>

        {toast && (
          <Text size="body-sm" color="accent">
            {toast}
          </Text>
        )}

        {selected.size > 0 && (
          <Inline gap="3" align="center">
            <Text size="body-sm">{selected.size} selected</Text>
            <Button size="sm" variant="secondary" onClick={handleRemove}>
              Remove from list
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </Inline>
        )}

        {members.length === 0 ? (
          <Box border="subtle" p="6" rounded="xl">
            <Text size="body-sm" color="muted">
              No members. Add people from TAM.
            </Text>
          </Box>
        ) : (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal" style={{ width: 40 }}>
                    <Checkbox
                      checked={headerState}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
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
                {members.map((r) => {
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
                        {r.employee_band
                          ? employeeLabel.get(r.employee_band) ?? r.employee_band
                          : "—"}
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
        )}
      </Stack>

      <SendToCampaignDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        recipients={enrollRecipients}
        sourceLabel={list.name}
        defaultCampaignName={list.name}
      />
    </Page>
  );
}
