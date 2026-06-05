/**
 * Scheduled Tasks BFF client. Talks to platform-api /api/v1/admin/scheduled-tasks,
 * which forwards to core-x — the Trigger.dev cron control plane (ops.scheduled_tasks
 * registry + status engine). Thin Supabase-bearer fetch wrapper, matching views/api.ts.
 *
 * PATCH carries no user_id; the BFF injects it (identity="body") from the validated
 * JWT so core-x records disabled_by. The browser never sets it.
 */
import { supabase } from "@/lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

export type SchedStatus = "green" | "amber" | "red" | "grey" | "disabled";
export type ExecutionKind = "modal_dispatch" | "hqx_compute";

export interface ScheduledTask {
  task_id: string;
  label: string;
  description: string;
  category: string;
  priority: number;
  is_sla_critical: boolean;
  cron: string;
  cron_human: string;
  timezone: string;
  execution_kind: ExecutionKind;
  modal_app: string | null;
  modal_function: string | null;
  hqx_endpoint: string | null;
  produces: string | null;
  grace_minutes: number;
  is_enabled: boolean;
  disabled_at: string | null;
  disabled_by: string | null;
  disable_reason: string | null;
  last_gate_check_at: string | null;
  notes: string | null;
  // computed by the status engine
  status: SchedStatus;
  status_reason: string;
  prev_fire: string | null;
  next_fire: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_id: string | null;
}

export interface ScheduledTasksSummary {
  total: number;
  green: number;
  amber: number;
  red: number;
  grey: number;
  disabled: number;
  p1_red: number;
  runs_source_ok: boolean;
  as_of: string;
}

export interface ScheduledTasksResponse {
  data: ScheduledTask[];
  summary: ScheduledTasksSummary;
}

export interface ScheduledTaskPatch {
  is_enabled?: boolean;
  priority?: number;
  is_sla_critical?: boolean;
  notes?: string;
  reason?: string;
}

export async function listScheduledTasks(): Promise<ScheduledTasksResponse> {
  const res = await fetch(`${API_BASE}/api/v1/admin/scheduled-tasks`, {
    headers: { Authorization: await bearer() },
  });
  return jsonOrThrow<ScheduledTasksResponse>(res);
}

export async function patchScheduledTask(
  taskId: string,
  patch: ScheduledTaskPatch,
): Promise<{ data: ScheduledTask }> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/scheduled-tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: await bearer() },
      body: JSON.stringify(patch),
    },
  );
  return jsonOrThrow<{ data: ScheduledTask }>(res);
}

// ─── display helpers ──────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<string, string> = {
  sec: "SEC",
  epiq: "epiq",
  gov: "Gov",
  usaspending: "USAspending",
  sam: "SAM",
  bridges: "Bridges",
  emitters: "Emitters",
  matching: "Matching",
  gtm: "GTM",
  dmaas: "DMaaS",
  voice: "Voice",
  infra: "Infra",
};

export function priorityLabel(p: number): string {
  return p === 1 ? "P1" : p === 3 ? "P3" : "P2";
}

// Severity ordering so reds float to the top of the default view.
export const STATUS_RANK: Record<SchedStatus, number> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
  disabled: 4,
};

export function relTime(iso: string | null): { text: string; past: boolean } | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = then - Date.now();
  const past = diffMs <= 0;
  const s = Math.abs(diffMs) / 1000;
  let mag: string;
  if (s < 60) mag = `${Math.round(s)}s`;
  else if (s < 3600) mag = `${Math.round(s / 60)}m`;
  else if (s < 86400) mag = `${(s / 3600).toFixed(1)}h`;
  else mag = `${(s / 86400).toFixed(1)}d`;
  return { text: past ? `${mag} ago` : `in ${mag}`, past };
}
