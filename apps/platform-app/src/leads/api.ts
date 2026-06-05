/**
 * Thin BFF client for /api/v1/gtm/people/*. Read-only access to the
 * gtm.people table, scoped via platform-api -> core-x.
 */
import { supabase } from "@/lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

export interface LeadRow {
  id: string;
  full_name: string | null;
  title: string | null;
  source: string | null;
  company_id: string | null;
  company_name: string | null;
  company_domain: string | null;
  company_linkedin_url: string | null;
}

export interface LeadsPage {
  data: LeadRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListLeadsParams {
  source?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listLeads(params: ListLeadsParams = {}): Promise<LeadsPage> {
  const qs = new URLSearchParams();
  if (params.source) qs.set("source", params.source);
  if (params.q) qs.set("q", params.q);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const url = `${API_BASE}/api/v1/gtm/people${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: await bearer() } });
  if (!res.ok) throw new Error(`leads list failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as LeadsPage;
}
