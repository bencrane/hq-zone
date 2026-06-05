/**
 * TAM (Total Addressable Market) client — person-grain lead search.
 * Each row is a person at a company, denormalized with company
 * context so the table can filter on both axes from one query.
 *
 * Currently fixture-backed for UI iteration. The BFF route at
 * `/api/v1/people/search` is the swap-in target: replace `searchTam`
 * body with a `fetch(...)` call when the BFF lands.
 */

import { TAM_FIXTURE } from "./fixture";

export interface TamRow {
  person_id: string;
  full_name: string;
  title: string;
  seniority_band: string;
  function: string;
  person_state: string | null;
  person_locality: string | null;
  email: string | null;
  linkedin: string | null;
  // company context (denormalized)
  company_id: string;
  company_name: string;
  industry: string | null;
  employee_band: string | null;
  revenue_band: string | null;
  company_hq_state: string | null;
  company_hq_locality: string | null;
  founded_year: number | null;
  website: string | null;
}

export interface TamSearchResult {
  total_matched: number;
  rows: TamRow[];
}

export interface TamSearchFilters {
  // person filters
  name?: string;
  title?: string;
  seniority?: string;
  function?: string;
  person_state?: string;
  // company filters
  company_name?: string;
  industry?: string;
  employee_band?: string;
  revenue_band?: string;
  hq_state?: string;
  hq_locality?: string;
  founded_year_min?: number;
  founded_year_max?: number;
  // paging
  limit?: number;
  offset?: number;
}

function matches(row: TamRow, f: TamSearchFilters): boolean {
  // person
  if (f.name && !row.full_name.toLowerCase().includes(f.name.toLowerCase())) return false;
  if (f.title && !row.title.toLowerCase().includes(f.title.toLowerCase())) return false;
  if (f.seniority && row.seniority_band !== f.seniority) return false;
  if (f.function && row.function !== f.function) return false;
  if (f.person_state && row.person_state !== f.person_state) return false;
  // company
  if (f.company_name && !row.company_name.toLowerCase().includes(f.company_name.toLowerCase()))
    return false;
  if (f.industry && row.industry !== f.industry) return false;
  if (f.employee_band && row.employee_band !== f.employee_band) return false;
  if (f.revenue_band && row.revenue_band !== f.revenue_band) return false;
  if (f.hq_state && row.company_hq_state !== f.hq_state) return false;
  if (
    f.hq_locality &&
    !(row.company_hq_locality ?? "").toLowerCase().includes(f.hq_locality.toLowerCase())
  )
    return false;
  if (f.founded_year_min != null && (row.founded_year ?? 0) < f.founded_year_min) return false;
  if (f.founded_year_max != null && (row.founded_year ?? 9999) > f.founded_year_max) return false;
  return true;
}

export async function searchTam(filters: TamSearchFilters): Promise<TamSearchResult> {
  // TODO swap to: fetch(`${API_BASE}/api/v1/people/search`, { method: "POST", body: JSON.stringify(filters), ... })
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const all = TAM_FIXTURE.filter((r) => matches(r, filters));
  return Promise.resolve({
    total_matched: all.length,
    rows: all.slice(offset, offset + limit),
  });
}

export async function getTamDetail(personId: string): Promise<TamRow | null> {
  const row = TAM_FIXTURE.find((r) => r.person_id === personId);
  return Promise.resolve(row ?? null);
}
