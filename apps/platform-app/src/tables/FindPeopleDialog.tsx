/**
 * "Find people" dialog — operates ON a Companies table. Picks companies
 * (default all rows), generates N mock people per company via
 * blitz-style synthesis, creates a new People table with
 * parent_table_id set, and navigates to it.
 *
 * Currently MOCKED — each selected company spawns 2-4 plausible
 * people with deterministic-from-seed values. Swap-out target:
 * blitz-api domain → contacts + PDL person enrichment.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  createTable,
  newCellEmpty,
  newColumnId,
  newRowId,
  type Column,
  type Row,
  type Table,
} from "@/lib/tables";

interface FindPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companiesTable: Table;
}

const FIRST = ["Avery", "Jordan", "Morgan", "Riley", "Quinn", "Sage", "Harper", "Reese"];
const LAST = ["Kim", "Patel", "Nguyen", "García", "Müller", "Okafor", "Brennan", "Sato"];
const TITLES = [
  "VP of Engineering",
  "Head of Data",
  "Director of Sales",
  "CFO",
  "Chief Revenue Officer",
  "Director of Operations",
  "Head of Marketing",
  "VP of Product",
];

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function pick<T>(arr: T[], s: string, salt: string): T {
  return arr[seedHash(s + salt) % arr.length];
}

function findCompanyNameColumn(t: Table): Column | undefined {
  return t.columns.find(
    (c) => c.kind === "native" && /(company.?name|legal.?name)/i.test(c.name),
  );
}

export function FindPeopleDialog({ open, onOpenChange, companiesTable }: FindPeopleDialogProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [peoplePer, setPeoplePer] = useState<number>(3);
  const [tableName, setTableName] = useState<string>("");
  const [seniority, setSeniority] = useState<string>("any");

  useEffect(() => {
    if (!open) return;
    // Default: select all companies, default people-per-company = 3.
    setSelected(new Set(companiesTable.rows.map((r) => r.id)));
    setPeoplePer(3);
    setTableName(`${companiesTable.name} — People`);
    setSeniority("any");
  }, [open, companiesTable]);

  function toggleOne(id: string, next: boolean | "indeterminate") {
    const copy = new Set(selected);
    if (next === true) copy.add(id);
    else copy.delete(id);
    setSelected(copy);
  }
  function toggleAll(next: boolean | "indeterminate") {
    if (next === true) setSelected(new Set(companiesTable.rows.map((r) => r.id)));
    else setSelected(new Set());
  }

  function handleFind() {
    if (selected.size === 0) return;
    const companyNameCol = findCompanyNameColumn(companiesTable);

    // Build the People table's native columns.
    const colFullName: Column = {
      id: `${newColumnId()}_full_name`,
      name: "Full name",
      kind: "native",
      data_type: "text",
    };
    const colTitle: Column = {
      id: `${newColumnId()}_title`,
      name: "Title",
      kind: "native",
      data_type: "text",
    };
    const colCompany: Column = {
      id: `${newColumnId()}_company`,
      name: "Company",
      kind: "native",
      data_type: "text",
    };

    const columns: Column[] = [colFullName, colTitle, colCompany];

    // Build rows: N people per selected company.
    const rows: Row[] = [];
    for (const companyRow of companiesTable.rows) {
      if (!selected.has(companyRow.id)) continue;
      const companyName = companyNameCol
        ? String(companyRow.cells[companyNameCol.id]?.value ?? companyRow.source_id)
        : companyRow.source_id;
      for (let i = 0; i < peoplePer; i++) {
        const seed = `${companyRow.source_id}-${i}-${seniority}`;
        const first = pick(FIRST, seed, "fn");
        const last = pick(LAST, seed, "ln");
        const title = pick(TITLES, seed, "title");
        const fullName = `${first} ${last}`;
        const rowId = newRowId();
        const sourceId = `${companyRow.source_id}-p${i + 1}`;
        rows.push({
          id: rowId,
          source_id: sourceId,
          parent_company_id: companyRow.source_id,
          cells: {
            [colFullName.id]: {
              value: fullName,
              status: "success",
              provider: "blitz (mock)",
              enriched_at: new Date().toISOString(),
            },
            [colTitle.id]: {
              value: title,
              status: "success",
              provider: "blitz (mock)",
              enriched_at: new Date().toISOString(),
            },
            [colCompany.id]: {
              value: companyName,
              status: "success",
              enriched_at: new Date().toISOString(),
            },
          },
        });
      }
    }

    // Ensure cells exist for every (row, column) pair, even if empty.
    for (const r of rows) {
      for (const c of columns) if (!r.cells[c.id]) r.cells[c.id] = newCellEmpty();
    }

    const peopleTable = createTable({
      workbook_id: companiesTable.workbook_id,
      name: tableName.trim() || `${companiesTable.name} — People`,
      kind: "people",
      columns,
      rows,
      parent_table_id: companiesTable.id,
    });

    onOpenChange(false);
    navigate(`/tables/${peopleTable.id}`);
  }

  const headerState: boolean | "indeterminate" =
    selected.size === 0
      ? false
      : selected.size === companiesTable.rows.length
      ? true
      : "indeterminate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find people</DialogTitle>
          <DialogDescription>
            Spawns a new People table from the selected companies. Each company contributes N people; you can enrich them after.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="people-table-name">New table name</Label>
            <input
              id="people-table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="h-9 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="people-per">People per company</Label>
            <input
              id="people-per"
              type="number"
              min={1}
              max={20}
              value={peoplePer}
              onChange={(e) => setPeoplePer(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="h-9 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seniority">Target seniority</Label>
            <select
              id="seniority"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className="h-9 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="any">Any seniority</option>
              <option value="vp">VP+</option>
              <option value="director">Director+</option>
              <option value="c_suite">C-suite only</option>
              <option value="ic">ICs</option>
            </select>
          </div>
        </div>

        <div className="rounded-md border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={headerState}
                onCheckedChange={toggleAll}
                aria-label="Select all companies"
              />
              <span className="text-xs uppercase tracking-wide text-white/50">
                {selected.size} of {companiesTable.rows.length} companies
              </span>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {companiesTable.rows.map((r) => {
              const nameCol = findCompanyNameColumn(companiesTable);
              const label = nameCol
                ? String(r.cells[nameCol.id]?.value ?? r.source_id)
                : r.source_id;
              return (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-white/5 px-3 py-1.5 text-sm last:border-0 hover:bg-white/5"
                >
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => toggleOne(r.id, v)}
                    aria-label={`Select ${label}`}
                  />
                  <span className="text-white/90">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleFind} disabled={selected.size === 0}>
            Find {selected.size * peoplePer} people
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
