/**
 * SignalsPage — `/signals`. Monitor + edit surface over the configuration-driven
 * GTM trigger registry (DEX ops.gtm_signals). One BFF round-trip on mount,
 * no live joins. Per-row inline edit of the two webhook URLs + the
 * webhook_target selector + delete button. All mutations are optimistic
 * with revert-on-error.
 */
import {
  Badge, Box, Button, Callout, Code, Flex, IconButton, SegmentedControl,
  Table, Text, TextField, Tooltip,
} from "@radix-ui/themes";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Button as UiButton, Inline, Page, Stack, Text as UiText,
} from "@rare-structure-hq/ui";

import {
  deleteGtmSignal,
  getGtmSignals,
  patchGtmSignal,
  type GtmSignal,
  type GtmSignalPatch,
  type GtmSignalsResponse,
  type WebhookTarget,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
 * EditableUrlCell — text input with save-on-blur / save-on-Enter, cancel-on-Esc.
 * Active indicator (small green dot + "FIRING" label) shows when this cell's
 * column matches the signal's webhook_target.
 */
function EditableUrlCell({
  initial, isFiring, onSave,
}: {
  initial: string;
  isFiring: boolean;
  onSave: (next: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If parent reloads data (e.g. after target toggle elsewhere), resync.
  useEffect(() => { setValue(initial); }, [initial]);

  const commit = async () => {
    if (value === initial) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
      setValue(initial); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <Flex direction="column" gap="1">
      <Flex gap="2" align="center">
        <TextField.Root
          size="1"
          value={value}
          placeholder="(empty)"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") { setValue(initial); (e.target as HTMLInputElement).blur(); }
          }}
          disabled={saving}
          style={{ flex: 1, minWidth: 0 }}
        />
        {isFiring ? (
          <Badge color="green" variant="solid" radius="full" size="1">
            FIRING
          </Badge>
        ) : null}
        {saving ? <Loader2 size={12} className="animate-spin" /> : null}
      </Flex>
      {error ? (
        <Text size="1" color="red">{error}</Text>
      ) : null}
    </Flex>
  );
}

function TargetToggle({
  value, onChange,
}: {
  value: WebhookTarget;
  onChange: (next: WebhookTarget) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = async (next: string) => {
    const target = next as WebhookTarget;
    if (target === value) return;
    setSaving(true);
    setError(null);
    try {
      await onChange(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Flex direction="column" gap="1">
      <Flex gap="2" align="center">
        <SegmentedControl.Root
          size="1" value={value} onValueChange={(v) => void handle(v)}
        >
          <SegmentedControl.Item value="test">Test</SegmentedControl.Item>
          <SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
        </SegmentedControl.Root>
        {saving ? <Loader2 size={12} className="animate-spin" /> : null}
      </Flex>
      {error ? <Text size="1" color="red">{error}</Text> : null}
    </Flex>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <IconButton
      size="1" variant="ghost" color="red"
      disabled={busy}
      onClick={async () => {
        const ok = window.confirm(
          "Delete this signal? This removes the row from ops.gtm_signals " +
          "permanently. Modal cron will stop firing it on the next tick.",
        );
        if (!ok) return;
        setBusy(true);
        try { await onDelete(); }
        finally { setBusy(false); }
      }}
      aria-label="Delete signal"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </IconButton>
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
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="14%">Signal Slug</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8%">Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="18%">Target</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="22%">Criteria</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="14%">Webhook Test URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="14%">Webhook Prod URL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="6%">Fires</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="4%">{""}</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {signals.map((sig) => (
          <Table.Row key={sig.signal_slug} align="start">
            <Table.RowHeaderCell>
              <Code variant="ghost" size="2">{sig.signal_slug}</Code>
            </Table.RowHeaderCell>
            <Table.Cell><StatusBadge isActive={sig.is_active} /></Table.Cell>
            <Table.Cell><Code variant="ghost" size="2">{sig.spine_target}</Code></Table.Cell>
            <Table.Cell><CriteriaCell criteria={sig.criteria} /></Table.Cell>
            <Table.Cell>
              <EditableUrlCell
                initial={sig.webhook_test_url}
                isFiring={sig.webhook_target === "test"}
                onSave={(next) => onPatch(sig.signal_slug, { webhook_test_url: next })}
              />
            </Table.Cell>
            <Table.Cell>
              <EditableUrlCell
                initial={sig.webhook_prod_url}
                isFiring={sig.webhook_target === "prod"}
                onSave={(next) => onPatch(sig.signal_slug, { webhook_prod_url: next })}
              />
            </Table.Cell>
            <Table.Cell>
              <TargetToggle
                value={sig.webhook_target}
                onChange={(next) => onPatch(sig.signal_slug, { webhook_target: next })}
              />
            </Table.Cell>
            <Table.Cell>
              <DeleteButton onDelete={() => onDelete(sig.signal_slug)} />
            </Table.Cell>
          </Table.Row>
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
