/**
 * Filter bar for TAM (person-grain lead search). Renders as a vertical
 * sidebar with two sections: Person filters and Company filters.
 * Holds local state; pushes "applied" filters back up via onApply
 * (debounced for text inputs).
 */
import { useEffect, useRef, useState } from "react";

import { Box, Inline, Stack, Text } from "@rare-structure-hq/ui";
import type { TamSearchFilters } from "./api";
import {
  EMPLOYEE_BANDS,
  FUNCTIONS,
  INDUSTRIES,
  REVENUE_BANDS,
  SENIORITY_BANDS,
  US_STATES,
} from "./constants";

const inputClass =
  "h-9 w-full rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-2 text-body-sm text-[color:var(--color-text-strong)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-accent-primary)] focus:outline-none";

const labelClass = "text-mono-xs uppercase tracking-wider";
const sectionLabelClass =
  "text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)]";

interface FilterBarProps {
  initial: TamSearchFilters;
  onApply: (filters: TamSearchFilters) => void;
}

export function FilterBar({ initial, onApply }: FilterBarProps) {
  // Person state
  const [name, setName] = useState(initial.name ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [seniority, setSeniority] = useState(initial.seniority ?? "");
  const [fn, setFn] = useState(initial.function ?? "");
  const [personState, setPersonState] = useState(initial.person_state ?? "");
  // Company state
  const [companyName, setCompanyName] = useState(initial.company_name ?? "");
  const [industry, setIndustry] = useState(initial.industry ?? "");
  const [employeeBand, setEmployeeBand] = useState(initial.employee_band ?? "");
  const [revenueBand, setRevenueBand] = useState(initial.revenue_band ?? "");
  const [hqState, setHqState] = useState(initial.hq_state ?? "");
  const [hqLocality, setHqLocality] = useState(initial.hq_locality ?? "");
  const [foundedMin, setFoundedMin] = useState(
    initial.founded_year_min != null ? String(initial.founded_year_min) : "",
  );
  const [foundedMax, setFoundedMax] = useState(
    initial.founded_year_max != null ? String(initial.founded_year_max) : "",
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next: TamSearchFilters = {};
      if (name) next.name = name;
      if (title) next.title = title;
      if (seniority) next.seniority = seniority;
      if (fn) next.function = fn;
      if (personState) next.person_state = personState;
      if (companyName) next.company_name = companyName;
      if (industry) next.industry = industry;
      if (employeeBand) next.employee_band = employeeBand;
      if (revenueBand) next.revenue_band = revenueBand;
      if (hqState) next.hq_state = hqState;
      if (hqLocality) next.hq_locality = hqLocality;
      if (foundedMin) next.founded_year_min = Number(foundedMin);
      if (foundedMax) next.founded_year_max = Number(foundedMax);
      onApply(next);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // onApply is stable via parent's useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    title,
    seniority,
    fn,
    personState,
    companyName,
    industry,
    employeeBand,
    revenueBand,
    hqState,
    hqLocality,
    foundedMin,
    foundedMax,
  ]);

  function clearAll() {
    setName("");
    setTitle("");
    setSeniority("");
    setFn("");
    setPersonState("");
    setCompanyName("");
    setIndustry("");
    setEmployeeBand("");
    setRevenueBand("");
    setHqState("");
    setHqLocality("");
    setFoundedMin("");
    setFoundedMax("");
  }

  return (
    <Box border="subtle" p="4" rounded="xl">
      <Stack gap="5">
        <Inline justify="between" align="center">
          <Text size="body-sm" color="muted" mono>
            Filters
          </Text>
          <button
            type="button"
            onClick={clearAll}
            className="text-mono-xs uppercase tracking-wider text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-default)]"
          >
            Clear all
          </button>
        </Inline>

        {/* ── Person ── */}
        <Stack gap="3">
          <Text size="body-xs" mono className={sectionLabelClass}>
            Person
          </Text>

          <Stack gap="1">
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="search…"
              className={inputClass}
            />
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. VP of Sales"
              className={inputClass}
            />
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Seniority</label>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {SENIORITY_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Function</label>
            <select
              value={fn}
              onChange={(e) => setFn(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {FUNCTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Person state</label>
            <select
              value={personState}
              onChange={(e) => setPersonState(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </Stack>
        </Stack>

        {/* ── Company ── */}
        <Stack gap="3">
          <Text size="body-xs" mono className={sectionLabelClass}>
            Company
          </Text>

          <Stack gap="1">
            <label className={labelClass}>Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="search…"
              className={inputClass}
            />
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Employees</label>
            <select
              value={employeeBand}
              onChange={(e) => setEmployeeBand(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {EMPLOYEE_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>Est. revenue</label>
            <select
              value={revenueBand}
              onChange={(e) => setRevenueBand(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {REVENUE_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>HQ state</label>
            <select
              value={hqState}
              onChange={(e) => setHqState(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </Stack>

          <Stack gap="1">
            <label className={labelClass}>HQ city</label>
            <input
              type="text"
              value={hqLocality}
              onChange={(e) => setHqLocality(e.target.value)}
              placeholder="e.g. Boston"
              className={inputClass}
            />
          </Stack>

          <Inline gap="2">
            <Stack gap="1" unsafe_className="flex-1">
              <label className={labelClass}>Founded (from)</label>
              <input
                type="number"
                value={foundedMin}
                onChange={(e) => setFoundedMin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="2010"
                className={inputClass}
              />
            </Stack>
            <Stack gap="1" unsafe_className="flex-1">
              <label className={labelClass}>Founded (to)</label>
              <input
                type="number"
                value={foundedMax}
                onChange={(e) => setFoundedMax(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="2024"
                className={inputClass}
              />
            </Stack>
          </Inline>
        </Stack>
      </Stack>
    </Box>
  );
}
