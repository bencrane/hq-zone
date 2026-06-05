import { X } from "lucide-react";
/**
 * Find Companies — criteria-driven search route at `/find/companies`.
 *
 * Two-pane layout. Left: criteria panel (industries, sizes, revenue,
 * employee range, location, founded-year range, company types,
 * description keywords). Right: live-updated preview of matching
 * companies. Bottom-right: "Continue with N" → lands matches into
 * a new or existing Companies table.
 *
 * Currently filters against TAM_FIXTURE. Swap-out target: BFF
 * /api/v1/companies/search backed by PDL + SAM.gov, with the
 * criteria payload shape inspired by Clay (`industries_include[]`,
 * `industries_exclude[]`, `sizes[]`, `revenue_bands[]`, …).
 *
 * Query params:
 *   `?into=<table_id>` — when present, "Continue" appends into that
 *                        existing Companies table instead of creating
 *                        a new one.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type Column,
  type Row,
  addRows,
  createTable,
  getTable,
  listTablesInWorkbook,
  newCellEmpty,
  newColumnId,
  newRowId,
} from "@/lib/tables";
import { ensureDefaultWorkbook, getWorkbook } from "@/lib/workbooks";
import { EMPLOYEE_BANDS, INDUSTRIES, REVENUE_BANDS, US_STATES } from "@/tam/constants";
import { TAM_FIXTURE } from "@/tam/fixture";

interface CompanyHit {
  company_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  employee_band: string | null;
  revenue_band: string | null;
  hq_state: string | null;
  hq_locality: string | null;
  founded_year: number | null;
  description: string;
}

interface Criteria {
  industries_include: string[];
  industries_exclude: string[];
  sizes: string[];
  revenue_bands: string[];
  employees_min: string;
  employees_max: string;
  hq_states: string[];
  hq_city: string;
  founded_min: string;
  founded_max: string;
  desc_include: string;
  desc_exclude: string;
  limit: string;
}

const EMPTY_CRITERIA: Criteria = {
  industries_include: [],
  industries_exclude: [],
  sizes: [],
  revenue_bands: [],
  employees_min: "",
  employees_max: "",
  hq_states: [],
  hq_city: "",
  founded_min: "",
  founded_max: "",
  desc_include: "",
  desc_exclude: "",
  limit: "",
};

// Translate an employee band ("51-200") into a numeric mid value for
// min/max range filtering without dragging in band-arithmetic.
function bandMin(band: string | null): number {
  if (!band) return 0;
  const m = band.match(/^(\d+)/);
  return m ? Number(m[1]) : 0;
}
function bandMax(band: string | null): number {
  if (!band) return 0;
  if (band.endsWith("+")) return Number.POSITIVE_INFINITY;
  const parts = band.split("-");
  if (parts.length === 2) return Number(parts[1]);
  return bandMin(band);
}

// Dedupe person-grain fixture down to company-grain, synthesize a description.
function uniqueCompanies(): CompanyHit[] {
  const byId = new Map<string, CompanyHit>();
  for (const r of TAM_FIXTURE) {
    if (byId.has(r.company_id)) continue;
    const desc =
      `${r.company_name} is a ${r.industry?.toLowerCase() ?? "private"} company based in ${
        r.company_hq_locality ?? "the US"
      }. ${r.employee_band ? `Employees: ${r.employee_band}.` : ""} ${
        r.founded_year ? `Founded in ${r.founded_year}.` : ""
      }`.trim();
    byId.set(r.company_id, {
      company_id: r.company_id,
      company_name: r.company_name,
      website: r.website,
      industry: r.industry,
      employee_band: r.employee_band,
      revenue_band: r.revenue_band,
      hq_state: r.company_hq_state,
      hq_locality: r.company_hq_locality,
      founded_year: r.founded_year,
      description: desc,
    });
  }
  return Array.from(byId.values());
}

const ALL_COMPANIES = uniqueCompanies();

function matches(c: CompanyHit, q: Criteria): boolean {
  if (q.industries_include.length > 0 && !(c.industry && q.industries_include.includes(c.industry)))
    return false;
  if (q.industries_exclude.length > 0 && c.industry && q.industries_exclude.includes(c.industry))
    return false;
  if (q.sizes.length > 0 && !(c.employee_band && q.sizes.includes(c.employee_band))) return false;
  if (q.revenue_bands.length > 0 && !(c.revenue_band && q.revenue_bands.includes(c.revenue_band)))
    return false;
  if (q.employees_min) {
    const m = Number(q.employees_min);
    if (!Number.isNaN(m) && bandMax(c.employee_band) < m) return false;
  }
  if (q.employees_max) {
    const m = Number(q.employees_max);
    if (!Number.isNaN(m) && bandMin(c.employee_band) > m) return false;
  }
  if (q.hq_states.length > 0 && !(c.hq_state && q.hq_states.includes(c.hq_state))) return false;
  if (q.hq_city && !(c.hq_locality ?? "").toLowerCase().includes(q.hq_city.toLowerCase()))
    return false;
  if (q.founded_min) {
    const m = Number(q.founded_min);
    if (!Number.isNaN(m) && (c.founded_year ?? 0) < m) return false;
  }
  if (q.founded_max) {
    const m = Number(q.founded_max);
    if (!Number.isNaN(m) && (c.founded_year ?? 9999) > m) return false;
  }
  if (q.desc_include) {
    const needles = q.desc_include
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const hay = `${c.company_name} ${c.description}`.toLowerCase();
    if (!needles.every((n) => hay.includes(n))) return false;
  }
  if (q.desc_exclude) {
    const needles = q.desc_exclude
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const hay = `${c.company_name} ${c.description}`.toLowerCase();
    if (needles.some((n) => hay.includes(n))) return false;
  }
  return true;
}

// ───────────── reusable form pieces ─────────────

function ChipMultiSelect({
  label,
  values,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const remaining = values.filter(
    (v) => !selected.includes(v) && (query ? v.toLowerCase().includes(query.toLowerCase()) : true),
  );

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(selected.filter((s) => s !== v))}
              className="text-white/60 hover:text-white"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "type to filter…"}
      />
      {query && remaining.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black/40">
          {remaining.slice(0, 8).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                onChange([...selected, v]);
                setQuery("");
              }}
              className="block w-full px-2 py-1 text-left text-sm text-white/80 hover:bg-white/5"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-white/10"
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-white hover:bg-white/5">
        {title}
      </summary>
      <div className="space-y-3 px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ───────────── main route ─────────────

export default function FindCompaniesRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const intoTableId = params.get("into") ?? undefined;
  const intoTable = intoTableId ? getTable(intoTableId) : null;

  // Resolve the workbook: explicit ?workbook=…, else the intoTable's
  // workbook, else the default. Workbooks are always required now.
  const workbookFromParam = params.get("workbook") ?? undefined;
  const workbookId = workbookFromParam ?? intoTable?.workbook_id ?? ensureDefaultWorkbook().id;
  const workbook = getWorkbook(workbookId);

  const [criteria, setCriteria] = useState<Criteria>(EMPTY_CRITERIA);
  const [destination, setDestination] = useState<"new" | string>(intoTableId ?? "new");
  const [newTableName, setNewTableName] = useState("");

  useEffect(() => {
    if (intoTableId) setDestination(intoTableId);
  }, [intoTableId]);

  function patch<K extends keyof Criteria>(key: K, value: Criteria[K]) {
    setCriteria((c) => ({ ...c, [key]: value }));
  }

  const matched = useMemo(() => ALL_COMPANIES.filter((c) => matches(c, criteria)), [criteria]);
  const limited = useMemo(() => {
    const lim = Number(criteria.limit);
    if (!Number.isNaN(lim) && lim > 0) return matched.slice(0, lim);
    return matched;
  }, [matched, criteria.limit]);

  // Existing tables you can append into are scoped to this workbook.
  const existingTables = useMemo(
    () => listTablesInWorkbook(workbookId).filter((t) => t.kind === "companies"),
    [workbookId],
  );

  function handleContinue() {
    if (limited.length === 0) return;

    if (destination === "new") {
      const { columns, map } = buildColumns();
      const rows = rowsFor(map, limited);
      const t = createTable({
        workbook_id: workbookId,
        name: newTableName.trim() || `Companies — ${new Date().toISOString().slice(0, 10)}`,
        kind: "companies",
        columns,
        rows,
      });
      navigate(`/tables/${t.id}`);
      return;
    }

    const existing = existingTables.find((t) => t.id === destination);
    if (!existing) return;
    function colByName(name: string): Column | undefined {
      return existing!.columns.find((c) => c.name === name);
    }
    const map: Record<string, string> = {};
    const lookup: [string, string][] = [
      ["company_name", "Company name"],
      ["domain", "Domain"],
      ["industry", "Industry"],
      ["employees", "Employees"],
      ["revenue", "Est. revenue"],
      ["hq", "HQ"],
      ["founded", "Founded"],
      ["description", "Description"],
    ];
    for (const [slug, name] of lookup) {
      const c = colByName(name);
      if (c) map[slug] = c.id;
    }
    const now = new Date().toISOString();
    const newRows: Row[] = limited.map((c) => {
      const cells: Row["cells"] = {};
      const set = (slug: string, value: unknown) => {
        const colId = map[slug];
        if (!colId) return;
        cells[colId] = {
          value: value as never,
          status: value == null || value === "" ? "empty" : "success",
          enriched_at: now,
        };
      };
      set("company_name", c.company_name);
      set("domain", c.website);
      set("industry", c.industry);
      set("employees", c.employee_band);
      set("revenue", c.revenue_band);
      set("hq", c.hq_locality && c.hq_state ? `${c.hq_locality}, ${c.hq_state}` : c.hq_state);
      set("founded", c.founded_year);
      set("description", c.description);
      for (const col of existing!.columns) if (!cells[col.id]) cells[col.id] = newCellEmpty();
      return { id: newRowId(), source_id: c.company_id, cells };
    });
    addRows(existing.id, newRows);
    navigate(`/tables/${existing.id}`);
  }

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex h-screen flex-col">
        {/* top bar */}
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={workbook ? `/workbooks/${workbook.id}` : "/workbooks"}>
              <Button variant="ghost" size="sm">
                ← Cancel
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Link to="/workbooks" className="hover:text-white/80">
                Workbooks
              </Link>
              {workbook && (
                <>
                  <span className="text-white/30">/</span>
                  <Link to={`/workbooks/${workbook.id}`} className="hover:text-white/80">
                    {workbook.name}
                  </Link>
                </>
              )}
              <span className="text-white/30">/</span>
              <span className="text-white">Find companies</span>
            </div>
            {intoTable && (
              <span className="rounded-md border border-white/15 px-2 py-0.5 text-xs text-white/70">
                → into <span className="font-medium text-white">{intoTable.name}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>
              Showing <span className="text-white">{limited.length.toLocaleString()}</span> of{" "}
              <span className="text-white">{matched.length.toLocaleString()}</span> matches
            </span>
            <Button onClick={handleContinue} disabled={limited.length === 0}>
              Continue with {limited.length}
            </Button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden">
          {/* criteria pane */}
          <aside className="space-y-3 overflow-y-auto border-r border-white/10 p-4">
            {destination === "new" && (
              <div className="space-y-1.5">
                <Label htmlFor="fc-name">New table name</Label>
                <Input
                  id="fc-name"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g. SaaS data engineering — Q3"
                />
              </div>
            )}
            {!intoTableId && (
              <div className="space-y-1.5">
                <Label htmlFor="fc-dest">Land in</Label>
                <select
                  id="fc-dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                >
                  <option value="new">+ New table</option>
                  {existingTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rows.length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Section title="Company attributes">
              <ChipMultiSelect
                label="Industries to include"
                values={INDUSTRIES}
                selected={criteria.industries_include}
                onChange={(v) => patch("industries_include", v)}
                placeholder="e.g. Software"
              />
              <ChipMultiSelect
                label="Industries to exclude"
                values={INDUSTRIES}
                selected={criteria.industries_exclude}
                onChange={(v) => patch("industries_exclude", v)}
                placeholder="e.g. Advertising"
              />
              <ChipMultiSelect
                label="Company sizes"
                values={EMPLOYEE_BANDS.map((b) => b.value)}
                selected={criteria.sizes}
                onChange={(v) => patch("sizes", v)}
                placeholder="e.g. 51-200"
              />
              <ChipMultiSelect
                label="Annual revenue"
                values={REVENUE_BANDS.map((b) => b.value)}
                selected={criteria.revenue_bands}
                onChange={(v) => patch("revenue_bands", v)}
                placeholder="e.g. 10M-50M"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Employees (min)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={criteria.employees_min}
                    onChange={(e) => patch("employees_min", e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Employees (max)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={criteria.employees_max}
                    onChange={(e) => patch("employees_max", e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Founded (from)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={criteria.founded_min}
                    onChange={(e) => patch("founded_min", e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Founded (to)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={criteria.founded_max}
                    onChange={(e) => patch("founded_max", e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description keywords to include</Label>
                <Input
                  value={criteria.desc_include}
                  onChange={(e) => patch("desc_include", e.target.value)}
                  placeholder="comma-separated (data, platform)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description keywords to exclude</Label>
                <Input
                  value={criteria.desc_exclude}
                  onChange={(e) => patch("desc_exclude", e.target.value)}
                  placeholder="comma-separated (agency, marketing)"
                />
              </div>
            </Section>

            <Section title="Location" defaultOpen={false}>
              <ChipMultiSelect
                label="HQ state"
                values={US_STATES.map((s) => s.code)}
                selected={criteria.hq_states}
                onChange={(v) => patch("hq_states", v)}
                placeholder="e.g. CA"
              />
              <div className="space-y-1.5">
                <Label>HQ city contains</Label>
                <Input
                  value={criteria.hq_city}
                  onChange={(e) => patch("hq_city", e.target.value)}
                  placeholder="e.g. Boston"
                />
              </div>
            </Section>

            <Section title="Limit results" defaultOpen={false}>
              <div className="space-y-1.5">
                <Label>Cap results to</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={criteria.limit}
                  onChange={(e) => patch("limit", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 500"
                />
              </div>
            </Section>

            <button
              type="button"
              onClick={() => setCriteria(EMPTY_CRITERIA)}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-xs uppercase tracking-wider text-white/60 hover:bg-white/5 hover:text-white"
            >
              Reset all
            </button>
          </aside>

          {/* preview pane */}
          <main className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm text-white/60">
              <span>Preview</span>
              <span>
                {limited.length.toLocaleString()} of {matched.length.toLocaleString()}
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-black">
                  <tr className="border-b border-white/10 text-left text-mono-xs uppercase tracking-wider text-white/50">
                    <th className="w-12 px-3 py-2 font-normal">#</th>
                    <th className="px-3 py-2 font-normal">Name</th>
                    <th className="px-3 py-2 font-normal">Description</th>
                    <th className="px-3 py-2 font-normal">Industry</th>
                    <th className="px-3 py-2 font-normal">Size</th>
                    <th className="px-3 py-2 font-normal">HQ</th>
                  </tr>
                </thead>
                <tbody>
                  {limited.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-white/40">
                        No companies match the current criteria.
                      </td>
                    </tr>
                  ) : (
                    limited.map((c, i) => (
                      <tr key={c.company_id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 font-mono text-mono-xs text-white/40">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{c.company_name}</td>
                        <td className="px-3 py-2 text-white/70">{truncate(c.description, 90)}</td>
                        <td className="px-3 py-2 text-white/80">{c.industry ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-mono-xs text-white/70">
                          {c.employee_band ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-mono-xs text-white/60">
                          {c.hq_locality && c.hq_state
                            ? `${c.hq_locality}, ${c.hq_state}`
                            : (c.hq_state ?? "—")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ───────────── new-table column shape ─────────────

function buildColumns(): { columns: Column[]; map: Record<string, string> } {
  const map: Record<string, string> = {
    company_name: `${newColumnId()}_company_name`,
    domain: `${newColumnId()}_domain`,
    industry: `${newColumnId()}_industry`,
    employees: `${newColumnId()}_employees`,
    revenue: `${newColumnId()}_revenue`,
    hq: `${newColumnId()}_hq`,
    founded: `${newColumnId()}_founded`,
    description: `${newColumnId()}_description`,
  };
  const columns: Column[] = [
    { id: map.company_name, name: "Company name", kind: "native", data_type: "text" },
    { id: map.domain, name: "Domain", kind: "native", data_type: "url" },
    { id: map.description, name: "Description", kind: "native", data_type: "text" },
    { id: map.industry, name: "Industry", kind: "native", data_type: "text" },
    { id: map.employees, name: "Employees", kind: "native", data_type: "text" },
    { id: map.revenue, name: "Est. revenue", kind: "native", data_type: "text" },
    { id: map.hq, name: "HQ", kind: "native", data_type: "text" },
    { id: map.founded, name: "Founded", kind: "native", data_type: "number" },
  ];
  return { columns, map };
}

function rowsFor(map: Record<string, string>, picks: CompanyHit[]): Row[] {
  const now = new Date().toISOString();
  return picks.map((c) => {
    const cells: Row["cells"] = {
      [map.company_name]: { value: c.company_name, status: "success", enriched_at: now },
      [map.domain]: {
        value: c.website,
        status: c.website ? "success" : "empty",
        enriched_at: now,
      },
      [map.description]: { value: c.description, status: "success", enriched_at: now },
      [map.industry]: {
        value: c.industry,
        status: c.industry ? "success" : "empty",
        enriched_at: now,
      },
      [map.employees]: {
        value: c.employee_band,
        status: c.employee_band ? "success" : "empty",
        enriched_at: now,
      },
      [map.revenue]: {
        value: c.revenue_band,
        status: c.revenue_band ? "success" : "empty",
        enriched_at: now,
      },
      [map.hq]: {
        value:
          c.hq_locality && c.hq_state ? `${c.hq_locality}, ${c.hq_state}` : (c.hq_state ?? null),
        status: c.hq_state ? "success" : "empty",
        enriched_at: now,
      },
      [map.founded]: {
        value: c.founded_year,
        status: c.founded_year != null ? "success" : "empty",
        enriched_at: now,
      },
    };
    return { id: newRowId(), source_id: c.company_id, cells };
  });
}
