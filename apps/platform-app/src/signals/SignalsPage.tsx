/**
 * SignalsPage — `/signals`. Monitor + edit surface over the configuration-driven
 * GTM trigger registry (DEX ops.gtm_signals). One BFF round-trip on mount,
 * no live joins. Per-row inline edit of the two webhook URLs + the
 * webhook_target selector + delete button. All mutations are optimistic
 * with revert-on-error.
 */
import {
  AlertDialog, Badge, Box, Button, Callout, Code, DropdownMenu, Flex, IconButton,
  SegmentedControl, Table, Text, TextField, Tooltip,
} from "@radix-ui/themes";
import { Check, Loader2, Pencil, Play, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Button as UiButton, Inline, Page, Stack, Text as UiText,
} from "@rare-structure-hq/ui";

import {
  deleteGtmSignal,
  fireGtmSignal,
  fireGtmSignalStatus,
  getGtmSignals,
  patchGtmSignal,
  type GtmSignal,
  type GtmSignalFireResult,
  type GtmSignalPatch,
  type GtmSignalsResponse,
  type WebhookTarget,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

import { AgentRunPanel } from "./AgentRunPanel";
import "./SignalsPage.css";

const KNOWN_KEY_LABELS: Record<string, string> = {
  time_window_hours: "Time window",
  min_obligated_usd: "Min obligated",
  award_types:       "Award types",
  action_types:      "Action types",
};

function formatTimeWindow(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

function formatActionType(v: unknown): string {
  if (v === null) return "(brand-new award)";
  return String(v);
}

function CriteriaCell({ criteria }: { criteria: Record<string, unknown> }) {
  const entries = Object.entries(criteria);
  if (entries.length === 0) {
    return <Text size="2" color="gray">(no criteria)</Text>;
  }
  return (
    <Flex direction="column" gap="1">
      {entries.map(([k, v]) => {
        const label = KNOWN_KEY_LABELS[k] ?? k;
        let value: React.ReactNode;
        if (k === "time_window_hours" && typeof v === "number") {
          value = <Text size="2">{formatTimeWindow(v)}</Text>;
        } else if (k === "min_obligated_usd" && typeof v === "number") {
          value = <Text size="2">{formatUsd(v)}</Text>;
        } else if (k === "award_types" && Array.isArray(v)) {
          value = (
            <Flex gap="1" wrap="wrap">
              {v.map((t, i) => (
                <Badge key={`${i}-${String(t)}`} color="blue" variant="soft" radius="full">
                  {String(t)}
                </Badge>
              ))}
            </Flex>
          );
        } else if (k === "action_types" && Array.isArray(v)) {
          value = (
            <Flex gap="1" wrap="wrap">
              {v.map((t, i) => (
                <Badge
                  key={`${i}-${String(t)}`}
                  color={t === null ? "gray" : "violet"}
                  variant="soft" radius="full"
                >
                  {formatActionType(t)}
                </Badge>
              ))}
            </Flex>
          );
        } else {
          value = <Code variant="ghost" size="2">{JSON.stringify(v)}</Code>;
        }
        return (
          <Flex key={k} gap="2" align="baseline">
            <Text
              size="1" color="gray" weight="medium"
              style={{ textTransform: "uppercase", minWidth: 110 }}
            >
              {label}
            </Text>
            <Box style={{ flex: 1 }}>{value}</Box>
          </Flex>
        );
      })}
    </Flex>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge color={isActive ? "green" : "gray"} variant="soft" radius="full">
      {isActive ? "Active" : "Muted"}
    </Badge>
  );
}

/**
 * UrlCell — read-only URL text by default; switches to a TextField when the
 * containing row is in edit mode. The FIRING badge follows the row's draft
 * target so toggling Test/Prod in edit mode updates the indicator live.
 */
function UrlCell({
  value, editing, isFiring, onChange,
}: {
  value: string;
  editing: boolean;
  isFiring: boolean;
  onChange: (next: string) => void;
}) {
  if (editing) {
    return (
      <Flex gap="2" align="center">
        <TextField.Root
          size="1"
          value={value}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        {isFiring ? (
          <Badge color="green" variant="solid" radius="full" size="1">FIRING</Badge>
        ) : null}
      </Flex>
    );
  }
  return (
    <Flex gap="2" align="center" style={{ minWidth: 0 }}>
      <Text
        size="2"
        title={value || undefined}
        style={{
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "var(--code-font-family, monospace)",
          color: value ? undefined : "var(--gray-9)",
        }}
      >
        {value || "(empty)"}
      </Text>
      {isFiring ? (
        <Badge color="green" variant="solid" radius="full" size="1">FIRING</Badge>
      ) : null}
    </Flex>
  );
}

/**
 * TargetCell — `<code>test|prod</code>` in display mode, segmented control
 * in edit mode. Mutates the parent row's draft, not the server.
 */
function TargetCell({
  value, editing, onChange,
}: {
  value: WebhookTarget;
  editing: boolean;
  onChange: (next: WebhookTarget) => void;
}) {
  if (editing) {
    return (
      <SegmentedControl.Root
        size="1" value={value} onValueChange={(v) => onChange(v as WebhookTarget)}
      >
        <SegmentedControl.Item value="test">Test</SegmentedControl.Item>
        <SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
      </SegmentedControl.Root>
    );
  }
  return <Code variant="ghost" size="2">{value}</Code>;
}

/**
 * FireResult — inline summary of the last manual fire for this row. Renders
 * directly below the action buttons so the operator sees the outcome without
 * leaving the table. Shape mirrors GtmSignalFireResult.
 */
function FireResultBadge({ result }: { result: GtmSignalFireResult }) {
  const dispatch = result.dispatch;
  const isHttp = typeof dispatch.status === "number";
  const ok = isHttp && (dispatch.status as number) >= 200 && (dispatch.status as number) < 300;
  const color = ok ? "green" : "red";
  const statusText = isHttp
    ? `HTTP ${dispatch.status}`
    : `${dispatch.status}${dispatch.exception_type ? ` (${dispatch.exception_type})` : ""}`;
  const rowText = result.limit_applied !== null
    ? `${result.sent_rows} of ${result.matched_rows_total} rows`
    : `${result.sent_rows} rows`;
  return (
    <Flex direction="column" gap="1" align="end">
      <Badge color={color} variant="soft" radius="full" size="1">
        → {result.webhook_target} · {statusText} · {rowText} · {dispatch.elapsed_ms}ms
      </Badge>
      {!ok && dispatch.exception ? (
        <Text size="1" color="red" style={{ maxWidth: 220, textAlign: "right" }}>
          {dispatch.exception}
        </Text>
      ) : null}
    </Flex>
  );
}

/**
 * RowActions — single action column. Display: fire-menu + pencil + trash.
 * Edit: save + cancel + trash. Save is disabled when there are no pending
 * changes. Fire is disabled while editing (no point firing draft state).
 * The fire dropdown lets the operator pick N (1 / 10 / 50 / 100 / all)
 * for the payload that goes to n8n — None = same as production cron.
 */
const FIRE_PRESETS: Array<{ label: string; limit: number | null }> = [
  { label: "Send 1 row",     limit: 1 },
  { label: "Send 10 rows",   limit: 10 },
  { label: "Send 50 rows",   limit: 50 },
  { label: "Send 100 rows",  limit: 100 },
];

function RowActions({
  signalSlug,
  editing, saving, deleting, firing, hasChanges, error, fireError, fireResult,
  webhookTarget, hasTargetUrl,
  onEdit, onSave, onCancel, onDelete, onFire, onRunAgent,
}: {
  signalSlug: string;
  editing: boolean;
  saving: boolean;
  deleting: boolean;
  firing: boolean;
  hasChanges: boolean;
  error: string | null;
  fireError: string | null;
  fireResult: GtmSignalFireResult | null;
  webhookTarget: WebhookTarget;
  hasTargetUrl: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onFire: (limit: number | null) => void;
  onRunAgent: () => void;
}) {
  const fireDisabled = firing || editing || !hasTargetUrl;
  const fireTooltip = !hasTargetUrl
    ? `webhook_${webhookTarget}_url is empty — set it before firing`
    : editing
      ? "Save or cancel edits before firing"
      : `Fire signal → ${webhookTarget} URL`;
  // Primary actions (Save/Cancel in edit, Fire/Edit in display) are tightly
  // grouped on the left. Delete is its own group, visually separated by a
  // vertical divider + a generous gap, so a mis-aimed click on Save/Cancel/
  // Edit doesn't land on Delete. Delete is always disabled while editing
  // (extra belt-and-suspenders).
  return (
    <Flex direction="column" gap="2" align="end">
      <Flex gap="3" align="center">
        <Flex gap="1" align="center">
          {editing ? (
            <>
              <Tooltip content={hasChanges ? "Save changes" : "No changes"}>
                <IconButton
                  size="2" variant="solid" color="green"
                  disabled={saving || !hasChanges}
                  onClick={onSave}
                  aria-label="Save signal"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </IconButton>
              </Tooltip>
              <Tooltip content="Cancel">
                <IconButton
                  size="2" variant="soft" color="gray"
                  disabled={saving}
                  onClick={onCancel}
                  aria-label="Cancel edit"
                >
                  <X size={16} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <DropdownMenu.Root>
                <Tooltip content={fireTooltip}>
                  <DropdownMenu.Trigger disabled={fireDisabled}>
                    <IconButton
                      size="2" variant="soft" color="blue"
                      disabled={fireDisabled}
                      aria-label="Fire signal"
                    >
                      {firing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    </IconButton>
                  </DropdownMenu.Trigger>
                </Tooltip>
                <DropdownMenu.Content>
                  <DropdownMenu.Label>
                    Fire → {webhookTarget} URL
                  </DropdownMenu.Label>
                  {FIRE_PRESETS.map((p) => (
                    <DropdownMenu.Item key={p.label} onClick={() => onFire(p.limit)}>
                      {p.label}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item color="red" onClick={() => onFire(null)}>
                    Send all matched rows (production cron parity)
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
              <Tooltip content="Run agent on this signal's cohort">
                <IconButton
                  size="2" variant="soft" color="iris"
                  onClick={onRunAgent}
                  aria-label="Run agent"
                >
                  <Sparkles size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Edit signal">
                <IconButton
                  size="2" variant="soft" color="gray"
                  onClick={onEdit}
                  aria-label="Edit signal"
                >
                  <Pencil size={16} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Flex>
        <Box
          aria-hidden
          style={{
            width: 1,
            height: 22,
            background: "var(--gray-a6)",
            flexShrink: 0,
          }}
        />
        <AlertDialog.Root>
          <Tooltip content={editing ? "Save or cancel edits first" : "Delete signal"}>
            <AlertDialog.Trigger disabled={deleting || editing}>
              <IconButton
                size="2" variant="ghost" color="red"
                disabled={deleting || editing}
                aria-label="Delete signal"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </IconButton>
            </AlertDialog.Trigger>
          </Tooltip>
          <AlertDialog.Content size="2" maxWidth="460px">
            <AlertDialog.Title>Delete signal?</AlertDialog.Title>
            <AlertDialog.Description>
              <Text as="p" size="2">
                You are about to delete{" "}
                <Code variant="ghost" size="2">{signalSlug}</Code> from{" "}
                <Code variant="ghost" size="2">ops.gtm_signals</Code>.
              </Text>
              <Text as="p" size="2" mt="2" color="gray">
                This is permanent. The Modal cron will stop firing it on the next
                tick. Re-creating it requires an INSERT.
              </Text>
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button variant="solid" color="red" onClick={onDelete}>
                  Delete permanently
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
      {error ? <Text size="1" color="red">{error}</Text> : null}
      {fireError ? <Text size="1" color="red" style={{ maxWidth: 220, textAlign: "right" }}>{fireError}</Text> : null}
      {fireResult ? <FireResultBadge result={fireResult} /> : null}
    </Flex>
  );
}

/**
 * SignalRow — owns its own edit state + pending-changes draft. Save commits
 * all pending field changes in one PATCH; cancel discards them. Display
 * values reflect either the draft (when editing) or the server row.
 */
function SignalRow({
  sig, onPatch, onDelete,
}: {
  sig: GtmSignal;
  onPatch: (slug: string, patch: GtmSignalPatch) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<GtmSignalPatch>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fireError, setFireError] = useState<string | null>(null);
  const [fireResult, setFireResult] = useState<GtmSignalFireResult | null>(null);
  // Each row owns its own agent-run drawer state. The drawer is keyed on
  // the row's signal_slug so re-opening the same row mints a fresh session
  // (per AgentRunPanel's no-reconnect v1 contract).
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);

  // If the row identity changes under us (rare — e.g. reload), drop the draft.
  useEffect(() => { setDraft({}); setError(null); }, [sig.signal_slug]);

  const testUrl = (draft.webhook_test_url ?? sig.webhook_test_url) as string;
  const prodUrl = (draft.webhook_prod_url ?? sig.webhook_prod_url) as string;
  const target  = (draft.webhook_target ?? sig.webhook_target) as WebhookTarget;
  const hasChanges = Object.keys(draft).length > 0;
  // Fire uses the *server* target/URL, not the draft — operator should save
  // edits before firing to avoid surprises ("did this fire test or prod?").
  const serverTargetUrl = sig.webhook_target === "prod" ? sig.webhook_prod_url : sig.webhook_test_url;

  const handleEdit   = () => { setError(null); setEditing(true); };
  const handleCancel = () => { setDraft({}); setError(null); setEditing(false); };
  const handleSave   = async () => {
    if (!hasChanges) { setEditing(false); return; }
    setSaving(true); setError(null);
    try {
      await onPatch(sig.signal_slug, draft);
      setDraft({});
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    // Confirmation is handled by the AlertDialog in RowActions — this only
    // fires after the operator clicks "Delete permanently" in the modal.
    setDeleting(true);
    try { await onDelete(sig.signal_slug); }
    finally { setDeleting(false); }
  };
  const handleFire = async (limit: number | null) => {
    const label = limit === null ? "all matched rows" : `${limit} rows`;
    const ok = window.confirm(
      `Fire signal ${sig.signal_slug} now?\n\n` +
      `→ ${sig.webhook_target.toUpperCase()} URL\n` +
      `→ ${label}\n\n` +
      `This shuttles to Modal and POSTs a real payload (same as the daily cron).`,
    );
    if (!ok) return;
    setFiring(true); setFireError(null); setFireResult(null);
    try {
      // POST /fire returns immediately with a call_id (Modal .spawn under the
      // hood — no more 30s-timeout split-brain). Then poll /fire/status/:id
      // until status === "done" or the safety cap fires. 2s interval, 5min cap
      // covers even wide-window 1y-of-FPDS queries that take ~60s end-to-end.
      const spawn = await fireGtmSignal(sig.signal_slug, limit === null ? {} : { limit });
      const POLL_INTERVAL_MS = 2000;
      const MAX_POLL_MS = 5 * 60 * 1000;
      const deadline = Date.now() + MAX_POLL_MS;
      let result: GtmSignalFireResult | null = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const status = await fireGtmSignalStatus(spawn.call_id);
        if (status.status === "done") {
          result = status.result;
          break;
        }
      }
      if (result === null) {
        throw new Error(`fire still pending after ${MAX_POLL_MS / 1000}s — check Modal dashboard for call_id ${spawn.call_id}`);
      }
      setFireResult(result);
    } catch (e) {
      setFireError(e instanceof Error ? e.message : "fire failed");
    } finally {
      setFiring(false);
    }
  };

  return (
    <Table.Row align="start">
      <Table.RowHeaderCell>
        <Code variant="ghost" size="2">{sig.signal_slug}</Code>
      </Table.RowHeaderCell>
      <Table.Cell><StatusBadge isActive={sig.is_active} /></Table.Cell>
      <Table.Cell><Code variant="ghost" size="2">{sig.spine_target}</Code></Table.Cell>
      <Table.Cell><CriteriaCell criteria={sig.criteria} /></Table.Cell>
      <Table.Cell>
        <UrlCell
          value={testUrl} editing={editing} isFiring={target === "test"}
          onChange={(v) => setDraft((d) => ({ ...d, webhook_test_url: v }))}
        />
      </Table.Cell>
      <Table.Cell>
        <UrlCell
          value={prodUrl} editing={editing} isFiring={target === "prod"}
          onChange={(v) => setDraft((d) => ({ ...d, webhook_prod_url: v }))}
        />
      </Table.Cell>
      <Table.Cell>
        <TargetCell
          value={target} editing={editing}
          onChange={(v) => setDraft((d) => ({ ...d, webhook_target: v }))}
        />
      </Table.Cell>
      <Table.Cell>
        <RowActions
          signalSlug={sig.signal_slug}
          editing={editing}
          saving={saving}
          deleting={deleting}
          firing={firing}
          hasChanges={hasChanges}
          error={error}
          fireError={fireError}
          fireResult={fireResult}
          webhookTarget={sig.webhook_target}
          hasTargetUrl={Boolean(serverTargetUrl)}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
          onFire={handleFire}
          onRunAgent={() => setAgentPanelOpen(true)}
        />
        {/* Drawer rendered at the row level so each row owns its own panel
            lifecycle; closing/aborting only affects this row's session. */}
        <AgentRunPanel
          open={agentPanelOpen}
          onOpenChange={setAgentPanelOpen}
          signalSlug={sig.signal_slug}
          limit={50}
          target="test"
        />
      </Table.Cell>
    </Table.Row>
  );
}

function SignalsTable({
  signals, onPatch, onDelete,
}: {
  signals: GtmSignal[];
  onPatch: (slug: string, patch: GtmSignalPatch) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
}) {
  if (signals.length === 0) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>
          No signals registered — INSERT a row into <Code>ops.gtm_signals</Code> to add one.
        </Callout.Text>
      </Callout.Root>
    );
  }
  return (
    // `className` is the only reliable knob — `style` on Table.Root lands on
    // the wrapper <div>, not the inner <table>. See SignalsPage.css.
    <Table.Root variant="surface" size="3" className="signals-table">
      <Table.Header>
        <Table.Row>
          {/* Column widths sum to 100% — kept here so the rebalance is
              visible at a glance. Action column needs ~13% to fit three
              size-2 IconButtons + the vertical divider between the
              primary-actions group and Delete (Play|Pencil divider Trash).
              Stole that width from the two URL columns (they ellipsis-
              truncate already, so dropping each from 16%→14% is invisible
              at typical viewport widths). */}
          <Table.ColumnHeaderCell width="11%">Signal Slug</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="6%">Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="15%">Target</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="21%">Criteria</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="14%">Webhook Test URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="14%">Webhook Prod URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="6%">Fires</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="13%">{""}</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {signals.map((sig) => (
          <SignalRow
            key={sig.signal_slug}
            sig={sig}
            onPatch={onPatch}
            onDelete={onDelete}
          />
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export default function SignalsPage() {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<GtmSignalsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setErr(null);
    return getGtmSignals()
      .then((res) => setData(res))
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "signals fetch failed");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getGtmSignals()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "signals fetch failed");
        setData(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Optimistic patch: update the row in local state, fire the API call,
  // revert on error by reloading (server is source of truth).
  const onPatch = async (slug: string, patch: GtmSignalPatch) => {
    setData((prev) => prev ? {
      signals: prev.signals.map((s) => s.signal_slug === slug ? { ...s, ...patch } : s),
    } : prev);
    try {
      const updated = await patchGtmSignal(slug, patch);
      setData((prev) => prev ? {
        signals: prev.signals.map((s) => s.signal_slug === slug ? updated : s),
      } : prev);
    } catch (e) {
      await reload(); // revert by re-fetching truth
      throw e;        // let the cell surface the error
    }
  };

  // Optimistic delete: remove the row, revert on error.
  const onDelete = async (slug: string) => {
    const snapshot = data;
    setData((prev) => prev ? {
      signals: prev.signals.filter((s) => s.signal_slug !== slug),
    } : prev);
    try {
      await deleteGtmSignal(slug);
    } catch (e) {
      setData(snapshot); // revert
      setErr(e instanceof Error ? e.message : "delete failed");
    }
  };

  const summary = useMemo(() => {
    if (!data) return null;
    const total = data.signals.length;
    const active = data.signals.filter((s) => s.is_active).length;
    return { total, active, muted: total - active };
  }, [data]);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Inline gap="3" align="center">
            <Link to="/"><UiButton variant="ghost" size="sm">← HQ</UiButton></Link>
            <Stack gap="1">
              <UiText as="h1" size="display-sm">GTM Signals</UiText>
              <UiText size="body-sm" color="muted">
                Configuration-driven trigger registry. Modal cron reads active rows daily
                at 09:00 UTC, compiles criteria, POSTs matched cohorts to the URL set by
                each signal's Fires selector (Test or Prod).
              </UiText>
            </Stack>
          </Inline>
          <Inline gap="3" align="center">
            <UiText size="body-xs" color="muted" mono>{session?.user.email}</UiText>
            <UiButton variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</UiButton>
          </Inline>
        </Inline>

        {loading ? (
          <Inline gap="2" align="center">
            <Loader2 size={14} className="animate-spin" />
            <UiText size="body-sm" color="muted">Loading signals…</UiText>
          </Inline>
        ) : err ? (
          <Inline gap="3" align="center">
            <UiText size="body-sm" color="muted">Failed to load signals: {err}</UiText>
            <Button size="1" variant="soft" onClick={() => void reload()}>Retry</Button>
          </Inline>
        ) : data ? (
          <>
            {summary ? (
              <Box>
                <Text size="2" color="gray">
                  {summary.total.toLocaleString()} signal{summary.total === 1 ? "" : "s"} —{" "}
                  {summary.active.toLocaleString()} active · {summary.muted.toLocaleString()} muted
                </Text>
              </Box>
            ) : null}
            <SignalsTable
              signals={data.signals}
              onPatch={onPatch}
              onDelete={onDelete}
            />
          </>
        ) : null}
      </Stack>
    </Page>
  );
}
