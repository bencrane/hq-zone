/**
 * Filter bar for the opportunities list. Holds local state; pushes
 * "applied" filters back up via onApply when any field changes
 * (debounced for text inputs).
 */
import { useEffect, useRef, useState } from "react";

import type { SearchFilters } from "@/lib/api";
import { Box, Inline, Stack, Text } from "@rare-structure-hq/ui";
import { NOTICE_TYPES, SET_ASIDE_CODES, US_STATES } from "./constants";

const inputClass =
  "h-9 w-full rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-2 text-body-sm text-[color:var(--color-text-strong)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-accent-primary)] focus:outline-none";

const labelClass = "text-mono-xs uppercase tracking-wider";

interface FilterBarProps {
  initial: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}

export function FilterBar({ initial, onApply }: FilterBarProps) {
  const [naics, setNaics] = useState(initial.naics_code ?? initial.naics_prefix ?? "");
  const [naicsPrefix, setNaicsPrefix] = useState(Boolean(initial.naics_prefix));
  const [department, setDepartment] = useState(initial.department_agency ?? "");
  const [popState, setPopState] = useState(initial.pop_state ?? "");
  const [setAside, setSetAside] = useState(initial.set_aside_code ?? "");
  const [noticeType, setNoticeType] = useState(initial.notice_type ?? "");
  const [postedGte, setPostedGte] = useState(initial.posted_date_gte ?? "");
  const [postedLte, setPostedLte] = useState(initial.posted_date_lte ?? "");
  const [deadlineGte, setDeadlineGte] = useState(initial.response_deadline_gte ?? "");
  const [deadlineLte, setDeadlineLte] = useState(initial.response_deadline_lte ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-apply. 350ms feels right for typed inputs; selects
  // also flow through so the UX is consistent.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are intentionally the filter values only — the effect re-debounces on input change, not on `onApply` identity. Adding `onApply` would re-fire the debounce on every parent render if the callback isn't memoized.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next: SearchFilters = {};
      if (naics) {
        if (naicsPrefix) next.naics_prefix = naics;
        else next.naics_code = naics;
      }
      if (department) next.department_agency = department;
      if (popState) next.pop_state = popState;
      if (setAside) next.set_aside_code = setAside;
      if (noticeType) next.notice_type = noticeType;
      if (postedGte) next.posted_date_gte = postedGte;
      if (postedLte) next.posted_date_lte = postedLte;
      if (deadlineGte) next.response_deadline_gte = deadlineGte;
      if (deadlineLte) next.response_deadline_lte = deadlineLte;
      onApply(next);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // onApply is intentionally not in the dep list — parent passes
    // a stable callback via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    naics,
    naicsPrefix,
    department,
    popState,
    setAside,
    noticeType,
    postedGte,
    postedLte,
    deadlineGte,
    deadlineLte,
  ]);

  function clearAll() {
    setNaics("");
    setNaicsPrefix(false);
    setDepartment("");
    setPopState("");
    setSetAside("");
    setNoticeType("");
    setPostedGte("");
    setPostedLte("");
    setDeadlineGte("");
    setDeadlineLte("");
  }

  return (
    <Box border="subtle" p="4" rounded="xl">
      <Stack gap="4">
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {/* NAICS */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-naics">
              NAICS
            </label>
            <Inline gap="2" align="center">
              <input
                id="opp-naics"
                type="text"
                value={naics}
                onChange={(e) => setNaics(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={naicsPrefix ? "e.g. 541" : "e.g. 541512"}
                className={inputClass}
              />
              <label className="flex shrink-0 items-center gap-1 text-mono-xs uppercase text-[color:var(--color-text-muted)]">
                <input
                  type="checkbox"
                  checked={naicsPrefix}
                  onChange={(e) => setNaicsPrefix(e.target.checked)}
                />
                prefix
              </label>
            </Inline>
          </Stack>

          {/* Department */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-department">
              Department
            </label>
            <input
              id="opp-department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. DEPT OF DEFENSE"
              className={inputClass}
            />
          </Stack>

          {/* State */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-pop-state">
              PoP State
            </label>
            <select
              id="opp-pop-state"
              value={popState}
              onChange={(e) => setPopState(e.target.value)}
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

          {/* Set-aside */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-set-aside">
              Set-aside
            </label>
            <select
              id="opp-set-aside"
              value={setAside}
              onChange={(e) => setSetAside(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {SET_ASIDE_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.label}
                </option>
              ))}
            </select>
          </Stack>

          {/* Notice type */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-notice-type">
              Notice type
            </label>
            <select
              id="opp-notice-type"
              value={noticeType}
              onChange={(e) => setNoticeType(e.target.value)}
              className={inputClass}
            >
              <option value="">Any</option>
              {NOTICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Stack>

          {/* Posted date range */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-posted-from">
              Posted (from)
            </label>
            <input
              id="opp-posted-from"
              type="date"
              value={postedGte}
              onChange={(e) => setPostedGte(e.target.value)}
              className={inputClass}
            />
          </Stack>
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-posted-to">
              Posted (to)
            </label>
            <input
              id="opp-posted-to"
              type="date"
              value={postedLte}
              onChange={(e) => setPostedLte(e.target.value)}
              className={inputClass}
            />
          </Stack>

          {/* Response deadline range */}
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-deadline-from">
              Deadline (from)
            </label>
            <input
              id="opp-deadline-from"
              type="date"
              value={deadlineGte}
              onChange={(e) => setDeadlineGte(e.target.value)}
              className={inputClass}
            />
          </Stack>
          <Stack gap="1">
            <label className={labelClass} htmlFor="opp-deadline-to">
              Deadline (to)
            </label>
            <input
              id="opp-deadline-to"
              type="date"
              value={deadlineLte}
              onChange={(e) => setDeadlineLte(e.target.value)}
              className={inputClass}
            />
          </Stack>
        </div>
      </Stack>
    </Box>
  );
}
