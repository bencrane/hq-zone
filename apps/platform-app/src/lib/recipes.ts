/**
 * Enrichment recipe registry. A recipe declares what columns it reads
 * from (inputs), what columns it writes to (outputs), and how to run
 * a single row.
 *
 * Currently all recipes are MOCKED — they return plausible values with
 * simulated provider latency so the product experience can be evaluated
 * before real providers are wired. Each mock has a per-row delay range
 * so the UX matches real-world async fan-out.
 *
 * Swap-out path: replace the `run` function body per recipe with a
 * fetch to the corresponding BFF endpoint (PDL, blitz, SAM, etc.).
 */

import type { Cell, Row, TableKind } from "./tables";

export interface RecipeOutputColumn {
  /** Stable suffix for the generated column id (so re-runs find the same column). */
  key: string;
  name: string;
  data_type?: "text" | "number" | "url" | "email" | "date" | "boolean";
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  provider: string;
  /** Table kinds this recipe applies to. */
  applies_to: TableKind[];
  /** Which native/enrichment columns this reads from (by name or stable key). */
  reads_from: string[];
  /** Output columns produced. */
  outputs: RecipeOutputColumn[];
  /** Per-row run. Returns one Cell per output column (same order as `outputs`). */
  run: (row: Row, allRows: Row[]) => Promise<Cell[]>;
}

// ───────────── mock latency helpers ─────────────

function jitterMs(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

function cellOk(value: string | number | boolean, provider: string): Cell {
  return { value, status: "success", enriched_at: nowIso(), provider };
}

function cellErr(provider: string, error: string): Cell {
  return { value: null, status: "error", enriched_at: nowIso(), provider, error };
}

// Pseudo-random hash so the same source_id gets the same mock value across re-runs.
function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function pick<T>(arr: T[], from: string, salt = ""): T {
  return arr[seed(from + salt) % arr.length];
}

// ───────────── shared mock pools ─────────────

const TECH_STACK = [
  "Snowflake · dbt · Looker",
  "BigQuery · Airflow · Mode",
  "Postgres · Hex · Metabase",
  "Databricks · Spark · Tableau",
  "Redshift · Sigma · Census",
];

const NEWS_HEADLINES = [
  "Closes Series B led by Accel",
  "Names new VP of Sales from Salesforce",
  "Acquires regional competitor in Q2",
  "Launches API platform for partners",
  "Opens second HQ in Austin",
  "Files S-1 for IPO",
];

const FIRST_NAMES = [
  "Avery",
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Devon",
  "Quinn",
  "Sage",
  "Reese",
  "Harper",
];
const LAST_NAMES = [
  "Kim",
  "Patel",
  "Nguyen",
  "García",
  "Müller",
  "Okafor",
  "Brennan",
  "Sato",
  "Ortiz",
  "Whitfield",
];
const TITLES = [
  "VP of Engineering",
  "Head of Data",
  "Director of Sales",
  "CFO",
  "Chief Revenue Officer",
  "Director of Operations",
];

// ───────────── recipes ─────────────

export const RECIPES: Recipe[] = [
  {
    id: "pdl.company.lookup",
    name: "PDL company lookup",
    description:
      "Pulls firmographic fields (employee count, revenue band, founded year, industry) from PDL companies.",
    provider: "PDL",
    applies_to: ["companies"],
    reads_from: ["domain", "legal_name"],
    outputs: [
      { key: "employee_count", name: "Employees (PDL)", data_type: "number" },
      { key: "revenue_band", name: "Revenue band (PDL)", data_type: "text" },
      { key: "founded_year", name: "Founded (PDL)", data_type: "number" },
      { key: "industry", name: "Industry (PDL)", data_type: "text" },
    ],
    async run(row) {
      await sleep(jitterMs(600, 1600));
      const employees = 50 + (seed(row.source_id) % 9950);
      const bands = ["1M-10M", "10M-50M", "50M-100M", "100M-1B", "1B+"];
      const industries = [
        "Information Technology",
        "Manufacturing",
        "Health Care",
        "Financial Services",
        "Logistics & Transportation",
        "Energy",
      ];
      const founded = 1965 + (seed(row.source_id + "y") % 60);
      return [
        cellOk(employees, "PDL"),
        cellOk(pick(bands, row.source_id, "rev"), "PDL"),
        cellOk(founded, "PDL"),
        cellOk(pick(industries, row.source_id, "ind"), "PDL"),
      ];
    },
  },
  {
    id: "pdl.person.enrich",
    name: "PDL person enrichment",
    description:
      "Fills missing person fields (email, LinkedIn, current title) for People-table rows from PDL.",
    provider: "PDL",
    applies_to: ["people"],
    reads_from: ["full_name", "company_name"],
    outputs: [
      { key: "email", name: "Email (PDL)", data_type: "email" },
      { key: "linkedin", name: "LinkedIn (PDL)", data_type: "url" },
      { key: "title", name: "Title (PDL)", data_type: "text" },
    ],
    async run(row) {
      await sleep(jitterMs(700, 1800));
      // 10% mock-error rate so error states show up in the UX.
      if (seed(row.source_id) % 10 === 0) {
        return [
          cellErr("PDL", "no match"),
          cellErr("PDL", "no match"),
          cellErr("PDL", "no match"),
        ];
      }
      const slug = row.source_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      return [
        cellOk(`${slug}@example.com`, "PDL"),
        cellOk(`linkedin.com/in/${slug}`, "PDL"),
        cellOk(pick(TITLES, row.source_id, "t"), "PDL"),
      ];
    },
  },
  {
    id: "blitz.domain.contacts",
    name: "Blitz: domain → contacts",
    description:
      "For a company, surface the highest-signal contacts (decision-makers) from blitz-api.",
    provider: "blitz",
    applies_to: ["companies"],
    reads_from: ["domain"],
    outputs: [
      { key: "primary_contact", name: "Primary contact (blitz)", data_type: "text" },
      { key: "primary_contact_email", name: "Primary email (blitz)", data_type: "email" },
    ],
    async run(row) {
      await sleep(jitterMs(800, 2000));
      const name = `${pick(FIRST_NAMES, row.source_id, "fn")} ${pick(LAST_NAMES, row.source_id, "ln")}`;
      const slug = name.toLowerCase().replace(/\s+/g, ".");
      const domain = `${row.source_id.toLowerCase()}.com`;
      return [cellOk(name, "blitz"), cellOk(`${slug}@${domain}`, "blitz")];
    },
  },
  {
    id: "blitz.linkedin.find",
    name: "Find LinkedIn URL",
    description: "Searches LinkedIn for the entity's profile URL via blitz-api.",
    provider: "blitz",
    applies_to: ["companies", "people"],
    reads_from: ["legal_name", "full_name"],
    outputs: [{ key: "linkedin_url", name: "LinkedIn URL", data_type: "url" }],
    async run(row) {
      await sleep(jitterMs(500, 1400));
      const slug = row.source_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = Math.random() > 0.5 ? "company" : "in";
      return [cellOk(`linkedin.com/${path}/${slug}`, "blitz")];
    },
  },
  {
    id: "internal.tech.stack",
    name: "Detect tech stack",
    description:
      "Best-guess data + analytics stack from public signals (job postings, blog mentions).",
    provider: "internal",
    applies_to: ["companies"],
    reads_from: ["domain"],
    outputs: [{ key: "tech_stack", name: "Tech stack", data_type: "text" }],
    async run(row) {
      await sleep(jitterMs(900, 2200));
      return [cellOk(pick(TECH_STACK, row.source_id, "ts"), "internal")];
    },
  },
  {
    id: "internal.recent.news",
    name: "Recent news",
    description: "Most-recent newsworthy event tied to the company (last 90 days).",
    provider: "internal",
    applies_to: ["companies"],
    reads_from: ["legal_name"],
    outputs: [
      { key: "recent_news", name: "Recent news", data_type: "text" },
      { key: "recent_news_date", name: "News date", data_type: "date" },
    ],
    async run(row) {
      await sleep(jitterMs(700, 1900));
      const headline = pick(NEWS_HEADLINES, row.source_id, "n");
      const daysAgo = seed(row.source_id + "d") % 90;
      const d = new Date(Date.now() - daysAgo * 86400_000).toISOString().slice(0, 10);
      return [cellOk(headline, "internal"), cellOk(d, "internal")];
    },
  },
];

export function getRecipe(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}

export function recipesFor(kind: TableKind): Recipe[] {
  return RECIPES.filter((r) => r.applies_to.includes(kind));
}
