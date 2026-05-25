/**
 * SignalsPage — `/signals`. Read-only monitor over the configuration-driven
 * GTM trigger registry (DEX ops.gtm_signals). One BFF round-trip on mount,
 * no live joins. Each row reports slug, status badge, spine target, criteria
 * (as a structured key/value list), and a truncated webhook URL.
 */
import { Badge, Box, Callout, Code, Flex, Stack as RxStack, Table, Text, Tooltip } from "@radix-ui/themes";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button, Inline, Page, Stack, Text as UiText } from "@rare-structure-hq/ui";

import { getGtmSignals, type GtmSignal, type GtmSignalsResponse } from "@/lib/api";
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
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatActionType(v: unknown): string {
  if (v === null) return "(brand-new award)";
  return String(v);
}

function CriteriaCell({ criteria }: { criteria: Record<string, unknown> }) {
  const entries = Object.entries(criteria);
  if (entries.length === 0) {
    return (
      <Text size="2" color="gray">
        (no criteria)
      </Text>
    );
  }
  return (
    <RxStack gap="1">
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
                  variant="soft"
                  radius="full"
                >
                  {formatActionType(t)}
                </Badge>
              ))}
            </Flex>
          );
        } else {
          value = (
            <Code variant="ghost" size="2">
              {JSON.stringify(v)}
            </Code>
          );
        }
        return (
          <Flex key={k} gap="2" align="baseline">
            <Text
              size="1"
              color="gray"
              weight="medium"
              style={{ textTransform: "uppercase", minWidth: 110 }}
            >
              {label}
            </Text>
            <Box style={{ flex: 1 }}>{value}</Box>
          </Flex>
        );
      })}
    </RxStack>
  );
}

function WebhookCell({ url }: { url: string }) {
  // Strip protocol + path; show "host.tld …/last_segment" for at-a-glance ident.
  let display = url;
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const tail = segments.length > 0 ? `/${segments[segments.length - 1]}` : "";
    display = `${u.host}${tail}`;
  } catch {
    // not a URL — leave verbatim, truncate
    display = url.length > 48 ? `${url.slice(0, 45)}…` : url;
  }
  return (
    <Tooltip content={url}>
      <Code variant="ghost" size="2" style={{ cursor: "help" }}>
        {display}
      </Code>
    </Tooltip>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge color={isActive ? "green" : "gray"} variant="soft" radius="full">
      {isActive ? "Active" : "Muted"}
    </Badge>
  );
}

function SignalsTable({ signals }: { signals: GtmSignal[] }) {
  if (signals.length === 0) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>
          No signals registered yet — INSERT a row into ops.gtm_signals to add one.
        </Callout.Text>
      </Callout.Root>
    );
  }
  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="22%">Signal Slug</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9%">Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="22%">Target</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="32%">Criteria</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="15%">Webhook</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {signals.map((sig) => (
          <Table.Row key={sig.signal_slug} align="start">
            <Table.RowHeaderCell>
              <Code variant="ghost" size="2">
                {sig.signal_slug}
              </Code>
            </Table.RowHeaderCell>
            <Table.Cell>
              <StatusBadge isActive={sig.is_active} />
            </Table.Cell>
            <Table.Cell>
              <Code variant="ghost" size="2">
                {sig.spine_target}
              </Code>
            </Table.Cell>
            <Table.Cell>
              <CriteriaCell criteria={sig.criteria} />
            </Table.Cell>
            <Table.Cell>
              <WebhookCell url={sig.n8n_webhook_url} />
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getGtmSignals()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "signals fetch failed");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            <Link to="/">
              <Button variant="ghost" size="sm">
                ← HQ
              </Button>
            </Link>
            <Stack gap="1">
              <UiText as="h1" size="display-sm">
                GTM Signals
              </UiText>
              <UiText size="body-sm" color="muted">
                Configuration-driven trigger registry. Modal cron reads active rows daily at
                09:00 UTC, compiles criteria, POSTs matched cohorts to n8n.
              </UiText>
            </Stack>
          </Inline>
          <Inline gap="3" align="center">
            <UiText size="body-xs" color="muted" mono>
              {session?.user.email}
            </UiText>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Inline>
        </Inline>

        {loading ? (
          <Inline gap="2" align="center">
            <Loader2 size={14} className="animate-spin" />
            <UiText size="body-sm" color="muted">
              Loading signals…
            </UiText>
          </Inline>
        ) : err ? (
          <UiText size="body-sm" color="muted">
            Failed to load signals: {err}
          </UiText>
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
            <SignalsTable signals={data.signals} />
          </>
        ) : null}
      </Stack>
    </Page>
  );
}
