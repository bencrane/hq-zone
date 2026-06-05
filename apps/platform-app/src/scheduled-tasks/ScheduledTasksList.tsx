/**
 * Scheduled Tasks — the Trigger.dev cron control plane (operator view).
 *
 * Lists every core-x scheduled task graded against its expected fire
 * (green/red/grey/amber/disabled), with status/category/priority/SLA filters
 * and a confirm-gated enable/disable toggle. Reads/writes via platform-api →
 * core-x. Auto-refreshes every 30s. Mirrors the SignalsPage / ViewsList patterns:
 * useState + useEffect, no react-query, @rare-structure-hq/ui primitives.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import {
  CATEGORY_LABEL,
  STATUS_RANK,
  type SchedStatus,
  type ScheduledTask,
  type ScheduledTasksSummary,
  listScheduledTasks,
  patchScheduledTask,
  priorityLabel,
  relTime,
} from "./api";

const REFRESH_MS = 30_000;

type BadgeTone = "default" | "accent" | "info" | "success" | "warn" | "error";

const STATUS_TONE: Record<SchedStatus, BadgeTone> = {
  green: "success",
  amber: "warn",
  red: "error",
  grey: "info",
  disabled: "default",
};

const STATUS_WORD: Record<SchedStatus, string> = {
  green: "green",
  amber: "amber",
  red: "red",
  grey: "pending",
  disabled: "off",
};

type StatusFilter = "all" | "attention" | SchedStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "red", label: "Red" },
  { key: "amber", label: "Amber" },
  { key: "grey", label: "Pending" },
  { key: "green", label: "Green" },
  { key: "disabled", label: "Disabled" },
];

const CHIP_BASE =
  "rounded-none border px-2.5 py-1 font-mono text-mono-xs uppercase transition-colors";
const CHIP_ON =
  "border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] text-[color:var(--color-text-default)]";
const CHIP_OFF =
  "border-[color:var(--color-border-subtle)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-default)]";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF}`}
    >
      {children}
    </button>
  );
}

export default function ScheduledTasksList() {
  const [tasks, setTasks] = useState<ScheduledTask[] | null>(null);
  const [summary, setSummary] = useState<ScheduledTasksSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cat, setCat] = useState<string | null>(null);
  const [prio, setPrio] = useState<number | null>(null);
  const [slaOnly, setSlaOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listScheduledTasks();
      setTasks(res.data);
      setSummary(res.summary);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks ?? []) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = (tasks ?? []).filter((t) => {
      if (statusFilter === "attention") {
        if (t.status !== "red" && t.status !== "amber") return false;
      } else if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (cat && t.category !== cat) return false;
      if (prio && t.priority !== prio) return false;
      if (slaOnly && !t.is_sla_critical) return false;
      if (needle) {
        const hay =
          `${t.label} ${t.task_id} ${t.category} ${t.modal_app ?? ""} ${t.hqx_endpoint ?? ""} ${t.produces ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return filtered.sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        a.priority - b.priority ||
        a.category.localeCompare(b.category) ||
        a.task_id.localeCompare(b.task_id),
    );
  }, [tasks, search, statusFilter, cat, prio, slaOnly]);

  return (
    <Page variant="default">
      <Stack gap="6">
        <Inline justify="between" align="start">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Scheduled Tasks
            </Text>
            <Text size="body-sm" color="muted">
              Every Trigger.dev cron in core-x, graded against its expected fire. green = fired on
              schedule · red = missed or failed · pending = window still open · amber =
              late/running. Auto-refreshes 30s.
            </Text>
          </Stack>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            refresh
          </Button>
        </Inline>

        {error && (
          <Box border="subtle" p="4" rounded="xl">
            <Text size="body-sm" color="muted">
              Failed to load: {error}
            </Text>
          </Box>
        )}

        {summary && (
          <Stack gap="3">
            {summary.p1_red > 0 && (
              <Box border="subtle" p="3" rounded="xl">
                <Inline gap="3" align="center">
                  <Badge tone="error">{summary.p1_red} P1 red</Badge>
                  <Text size="body-sm" color="muted">
                    SLA-critical schedule{summary.p1_red > 1 ? "s are" : " is"} red.
                  </Text>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("red");
                      setSlaOnly(true);
                    }}
                    className="font-mono text-mono-xs uppercase text-[color:var(--color-text-default)] underline"
                  >
                    show them
                  </button>
                </Inline>
              </Box>
            )}
            {!summary.runs_source_ok && (
              <Box border="subtle" p="3" rounded="xl">
                <Text size="body-sm" color="muted">
                  Could not read Trigger.dev run history — statuses are unverified (registry +
                  cadence only).
                </Text>
              </Box>
            )}
            <Inline gap="4" wrap>
              <Stat label="green" value={summary.green} />
              <Stat label="red" value={summary.red} />
              <Stat label="amber" value={summary.amber} />
              <Stat label="pending" value={summary.grey} />
              <Stat label="disabled" value={summary.disabled} />
              <Stat label="total" value={summary.total} />
            </Inline>
          </Stack>
        )}

        {/* Filters */}
        <Stack gap="3">
          <Inline gap="2" wrap>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search task, modal app, produces…"
              className="h-8 w-64 rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-3 text-body-sm text-[color:var(--color-text-default)] placeholder:text-[color:var(--color-text-muted)]"
            />
            {STATUS_FILTERS.map((s) => (
              <Chip
                key={s.key}
                active={statusFilter === s.key}
                onClick={() => setStatusFilter(s.key)}
              >
                {s.label}
              </Chip>
            ))}
          </Inline>
          <Inline gap="2" wrap>
            <Chip active={cat === null} onClick={() => setCat(null)}>
              all categories
            </Chip>
            {categories.map(([c, n]) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
                {CATEGORY_LABEL[c] ?? c} {n}
              </Chip>
            ))}
            {[1, 2, 3].map((pr) => (
              <Chip key={pr} active={prio === pr} onClick={() => setPrio(prio === pr ? null : pr)}>
                {priorityLabel(pr)}
              </Chip>
            ))}
            <Chip active={slaOnly} onClick={() => setSlaOnly((v) => !v)}>
              SLA-critical only
            </Chip>
          </Inline>
        </Stack>

        {/* Table */}
        {tasks === null && !error && (
          <Text size="body-sm" color="muted">
            Loading…
          </Text>
        )}
        {tasks !== null && (
          <Box border="subtle" rounded="xl" unsafe_className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border-subtle)] text-left font-mono text-mono-xs uppercase text-[color:var(--color-text-muted)]">
                  <th className="px-3 py-2 font-normal">Task</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 font-normal">Cadence</th>
                  <th className="px-3 py-2 font-normal">Last run</th>
                  <th className="px-3 py-2 font-normal">Next</th>
                  <th className="px-3 py-2 font-normal">Runtime</th>
                  <th className="px-3 py-2 text-right font-normal">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-[color:var(--color-text-muted)]"
                    >
                      No tasks match these filters.
                    </td>
                  </tr>
                )}
                {rows.map((t) => (
                  <TaskRow key={t.task_id} task={t} onChanged={() => void load()} />
                ))}
              </tbody>
            </table>
          </Box>
        )}
        {summary && (
          <Text size="mono-xs" color="muted">
            {rows.length} of {summary.total} · as of {new Date(summary.as_of).toLocaleTimeString()}
          </Text>
        )}
      </Stack>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap="1">
      <Text size="display-sm">{value}</Text>
      <Text size="mono-xs" color="muted">
        {label}
      </Text>
    </Stack>
  );
}

function TaskRow({ task: t, onChanged }: { task: ScheduledTask; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const last = relTime(t.last_run_at);
  const next = relTime(t.next_fire);

  const setEnabled = async (enabled: boolean, reason?: string) => {
    setBusy(true);
    setErr(null);
    try {
      await patchScheduledTask(t.task_id, { is_enabled: enabled, reason });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <tr
        className={`border-b border-[color:var(--color-border-subtle)] last:border-0 hover:bg-[color:var(--color-surface-raised)] ${t.is_enabled ? "" : "opacity-60"}`}
      >
        <td className="px-3 py-2 align-top">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-left"
            aria-label="expand"
          >
            <Inline gap="2" align="center">
              {t.is_sla_critical && <Badge tone="error">SLA</Badge>}
              <Text size="body-sm">{t.label}</Text>
              <Badge tone="default">{priorityLabel(t.priority)}</Badge>
            </Inline>
            <div className="mt-0.5 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
              {t.task_id}
            </div>
          </button>
        </td>
        <td className="px-3 py-2 align-top">
          <Badge tone={STATUS_TONE[t.status]}>{STATUS_WORD[t.status]}</Badge>
          <div className="mt-1 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
            {last ? last.text : "no runs"}
            {t.last_run_status ? ` · ${t.last_run_status}` : ""}
          </div>
        </td>
        <td className="px-3 py-2 align-top">
          <div className="text-[color:var(--color-text-default)]">{t.cron_human}</div>
          <div className="mt-0.5 font-mono text-mono-xs text-[color:var(--color-text-muted)]">
            {t.cron}
          </div>
        </td>
        <td className="px-3 py-2 align-top font-mono text-mono-xs text-[color:var(--color-text-muted)]">
          {t.is_enabled ? (next ? next.text : "—") : "—"}
        </td>
        <td className="px-3 py-2 align-top font-mono text-mono-xs text-[color:var(--color-text-muted)]">
          {t.execution_kind === "modal_dispatch" ? (
            <>
              <div className="text-[color:var(--color-text-default)]">{t.modal_app}</div>
              <div>::{t.modal_function} · handoff to Modal</div>
            </>
          ) : (
            <>
              <div className="text-[color:var(--color-text-default)]">core-x</div>
              <div>runs in core-x</div>
            </>
          )}
        </td>
        <td className="px-3 py-2 text-right align-top">
          {confirming ? (
            <Inline gap="2" justify="end">
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(
                    `Disable "${t.label}"? Stops its ${t.execution_kind === "modal_dispatch" ? "Modal dispatch" : "core-x work"} on the next fire. Optional reason:`,
                    "",
                  );
                  if (reason === null) {
                    setConfirming(false);
                    return;
                  }
                  void setEnabled(false, reason || undefined);
                }}
              >
                confirm disable
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                cancel
              </Button>
            </Inline>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => (t.is_enabled ? setConfirming(true) : void setEnabled(true))}
            >
              {t.is_enabled ? "on" : "off"}
            </Button>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)]">
          <td colSpan={7} className="px-3 py-3">
            <Stack gap="2">
              <Text size="body-sm" color="muted">
                {t.description}
              </Text>
              <Inline gap="6" wrap>
                <Detail k="produces" v={t.produces ?? "—"} />
                <Detail
                  k="target"
                  v={
                    t.execution_kind === "modal_dispatch"
                      ? `${t.modal_app}::${t.modal_function}`
                      : (t.hqx_endpoint ?? "—")
                  }
                />
                <Detail k="status" v={t.status_reason} />
                <Detail k="grace" v={`${t.grace_minutes} min`} />
                <Detail
                  k="last gate check"
                  v={t.last_gate_check_at ? (relTime(t.last_gate_check_at)?.text ?? "—") : "never"}
                />
                {!t.is_enabled && (
                  <Detail
                    k="disabled"
                    v={`${t.disabled_by ?? "?"}${t.disable_reason ? ` — ${t.disable_reason}` : ""}`}
                  />
                )}
              </Inline>
              {err && (
                <Text size="body-sm" color="muted">
                  {err}
                </Text>
              )}
            </Stack>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <span className="font-mono text-mono-xs">
      <span className="text-[color:var(--color-text-muted)]">{k}: </span>
      <span className="break-all text-[color:var(--color-text-default)]">{v}</span>
    </span>
  );
}
