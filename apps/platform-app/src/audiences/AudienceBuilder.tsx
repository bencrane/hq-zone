/**
 * Audience builder — `/audiences/new`. Operator-authored form that
 * composes an audience-spec from the source-catalog field metadata.
 *
 * Authoring flow:
 *   1. Pick a source (drives entity_grain + available fields).
 *   2. Title + description.
 *   3. Add criteria rows: field → operator → value. Operator + value
 *      shapes are driven by the field's catalog entry (enum_nullable
 *      offers IS NULL; numeric offers gt/gte/lt/lte/between; date offers
 *      between_relative_days etc.).
 *   4. Submit → POST /api/v1/audiences. BFF returns the persisted entity.
 *
 * The form is driven entirely by the catalog. Adding new sources or new
 * fields to a source is a pure backend add; this component re-renders.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type {
  AudienceCriterion,
  AudienceField,
  AudienceOperator,
  AudienceSourceCatalogEntry,
  AudienceSpec,
} from "@rare-structure-hq/shared";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { createAudience, listSourceCatalog } from "./api";

// ---------------------------------------------------------------------------
// Form state — operator-authored. Convert to AudienceSpec at submit time.
// ---------------------------------------------------------------------------

interface CriterionDraft {
  _id: string; // stable client-side id for React keys
  field: string;
  operator: AudienceOperator | "";
  value: unknown;
}

interface AudienceDraft {
  title: string;
  description: string;
  source_id: string;
  criteria: CriterionDraft[];
}

const EMPTY_DRAFT: AudienceDraft = {
  title: "",
  description: "",
  source_id: "",
  criteria: [],
};

// ---------------------------------------------------------------------------
// Operator → human label
// ---------------------------------------------------------------------------

const OPERATOR_LABELS: Record<AudienceOperator, string> = {
  is_null: "is NULL (brand-new — no modification)",
  is_not_null: "is NOT NULL (any modification)",
  eq: "equals",
  neq: "does not equal",
  in: "is one of",
  not_in: "is none of",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "between",
  between_relative_days: "in the past N days",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getField(
  source: AudienceSourceCatalogEntry | null,
  fieldName: string,
): AudienceField | null {
  if (!source) return null;
  return source.fields.find((f) => f.name === fieldName) ?? null;
}

function operatorNeedsValue(op: AudienceOperator): boolean {
  return op !== "is_null" && op !== "is_not_null";
}

function defaultValueForOperator(op: AudienceOperator): unknown {
  if (op === "between") return [null, null];
  if (op === "between_relative_days") return { n_days_back: 30 };
  if (op === "in" || op === "not_in") return [];
  if (op === "is_null" || op === "is_not_null") return undefined;
  return null;
}

// ---------------------------------------------------------------------------
// Value input — shape depends on (operator, field.type)
// ---------------------------------------------------------------------------

function ValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: AudienceField;
  operator: AudienceOperator;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (operator === "is_null" || operator === "is_not_null") {
    return null;
  }
  if (operator === "between_relative_days") {
    const v = (value as { n_days_back?: number } | null)?.n_days_back ?? 30;
    return (
      <Inline gap="2" align="center">
        <input
          type="number"
          min={1}
          value={v}
          onChange={(e) =>
            onChange({ n_days_back: Math.max(1, Number.parseInt(e.target.value || "1", 10)) })
          }
          className="w-24 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
        />
        <Text size="body-sm" color="muted">
          days
        </Text>
      </Inline>
    );
  }
  if (operator === "between") {
    const [lo, hi] = Array.isArray(value) ? (value as [unknown, unknown]) : [null, null];
    return (
      <Inline gap="2" align="center">
        <input
          type={field.type === "number" ? "number" : "text"}
          placeholder="min"
          value={(lo as string | number | null) ?? ""}
          onChange={(e) => onChange([e.target.value, hi])}
          className="w-32 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
        />
        <Text size="body-sm" color="muted">
          to
        </Text>
        <input
          type={field.type === "number" ? "number" : "text"}
          placeholder="max"
          value={(hi as string | number | null) ?? ""}
          onChange={(e) => onChange([lo, e.target.value])}
          className="w-32 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
        />
      </Inline>
    );
  }
  if (operator === "in" || operator === "not_in") {
    // Multi-select for enums; comma-separated for text/number
    if ((field.type === "enum" || field.type === "enum_nullable") && field.options) {
      const arr = Array.isArray(value) ? (value as unknown[]) : [];
      return (
        <select
          multiple
          value={arr.map((v) => JSON.stringify(v))}
          onChange={(e) => {
            const picked = Array.from(e.target.selectedOptions).map((o) => JSON.parse(o.value));
            onChange(picked);
          }}
          className="min-w-[16rem] rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
        >
          {field.options.map((opt) => (
            <option key={JSON.stringify(opt.value)} value={JSON.stringify(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    const csv = Array.isArray(value) ? (value as unknown[]).join(", ") : "";
    return (
      <input
        type="text"
        placeholder="comma-separated values"
        value={csv}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          )
        }
        className="w-72 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
      />
    );
  }
  // Single value: eq, neq, gt, gte, lt, lte
  if ((field.type === "enum" || field.type === "enum_nullable") && field.options) {
    return (
      <select
        value={value === null || value === undefined ? "" : JSON.stringify(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : JSON.parse(e.target.value))}
        className="min-w-[16rem] rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
      >
        <option value="">— pick —</option>
        {field.options.map((opt) => (
          <option key={JSON.stringify(opt.value)} value={JSON.stringify(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        value={(value as number | null) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number.parseFloat(e.target.value))}
        className="w-40 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
      />
    );
  }
  if (field.type === "date") {
    return (
      <input
        type="date"
        value={(value as string | null) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-40 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <select
        value={value === true ? "true" : value === false ? "false" : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "true")}
        className="w-32 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
      >
        <option value="">— pick —</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return (
    <input
      type="text"
      value={(value as string | null) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-72 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AudienceBuilder() {
  const [catalog, setCatalog] = useState<AudienceSourceCatalogEntry[] | null>(null);
  const [draft, setDraft] = useState<AudienceDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    listSourceCatalog()
      .then((sources) => {
        setCatalog(sources);
        // Pre-pick the first source if there's only one (v1 = usaspending_contracts only)
        if (sources.length > 0) {
          setDraft((d) => (d.source_id === "" ? { ...d, source_id: sources[0].source_id } : d));
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  const selectedSource = useMemo<AudienceSourceCatalogEntry | null>(() => {
    if (!catalog) return null;
    return catalog.find((s) => s.source_id === draft.source_id) ?? null;
  }, [catalog, draft.source_id]);

  function updateCriterion(idx: number, patch: Partial<CriterionDraft>) {
    setDraft((d) => ({
      ...d,
      criteria: d.criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  function addCriterion() {
    if (!selectedSource || selectedSource.fields.length === 0) return;
    setDraft((d) => ({
      ...d,
      criteria: [
        ...d.criteria,
        {
          _id: crypto.randomUUID(),
          field: selectedSource.fields[0].name,
          operator: "",
          value: null,
        },
      ],
    }));
  }

  function removeCriterion(idx: number) {
    setDraft((d) => ({
      ...d,
      criteria: d.criteria.filter((_, i) => i !== idx),
    }));
  }

  async function submit() {
    setError(null);
    if (!selectedSource) {
      setError("Pick a source");
      return;
    }
    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }
    // Validate criteria: each must have a field + operator; non-null-operator must have a value
    for (const c of draft.criteria) {
      if (!c.field || !c.operator) {
        setError("Every criterion needs a field and an operator");
        return;
      }
      if (
        operatorNeedsValue(c.operator) &&
        (c.value === null || c.value === undefined || c.value === "")
      ) {
        setError(`Criterion '${c.field} ${c.operator}' needs a value`);
        return;
      }
    }
    const spec: AudienceSpec = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      entity_grain: selectedSource.entity_grain,
      sources: [{ source_id: selectedSource.source_id }],
      criteria: draft.criteria.map((c) => {
        const out: AudienceCriterion = {
          field: c.field,
          operator: c.operator as AudienceOperator,
        };
        if (operatorNeedsValue(c.operator as AudienceOperator)) {
          out.value = c.value;
        }
        return out;
      }),
    };
    setSubmitting(true);
    try {
      const created = await createAudience(spec);
      navigate(`/audiences/${created.id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              New audience
            </Text>
            <Text size="body-sm" color="muted">
              Compose a deterministic cohort. The criteria spec is the contract: same spec → same
              query, every run.
            </Text>
          </Stack>
          <Link to="/audiences">
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </Link>
        </Inline>

        {error && (
          <Box border="subtle" p="3" unsafe_className="rounded-md">
            <Text size="body-sm" color="muted">
              {error}
            </Text>
          </Box>
        )}

        {/* Identity */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="4">
            <Text as="h2" size="body-lg">
              Identity
            </Text>
            <Stack gap="2">
              <Text size="body-sm" color="muted">
                Title
              </Text>
              <input
                type="text"
                placeholder="e.g. Brand-new contract winners (past 30 days, any value)"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-3 py-2 text-body-md"
              />
            </Stack>
            <Stack gap="2">
              <Text size="body-sm" color="muted">
                Description
              </Text>
              <textarea
                placeholder="What is this cohort? Why does it exist? When should it be used?"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={3}
                className="w-full rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-3 py-2 text-body-sm"
              />
            </Stack>
          </Stack>
        </Box>

        {/* Source */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="4">
            <Text as="h2" size="body-lg">
              Source
            </Text>
            {catalog === null ? (
              <Text size="body-sm" color="muted">
                Loading source catalog…
              </Text>
            ) : (
              <Stack gap="2">
                <select
                  value={draft.source_id}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, source_id: e.target.value, criteria: [] }))
                  }
                  className="w-full rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-3 py-2 text-body-md"
                >
                  <option value="">— pick a source —</option>
                  {catalog.map((s) => (
                    <option key={s.source_id} value={s.source_id}>
                      {s.display_name}
                    </option>
                  ))}
                </select>
                {selectedSource && (
                  <Stack gap="1">
                    <Text size="body-sm" color="muted">
                      {selectedSource.description}
                    </Text>
                    <Text size="mono-xs" color="muted">
                      {selectedSource.kind} · {selectedSource.identifier} · grain ={" "}
                      {selectedSource.entity_grain}
                    </Text>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Criteria */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="4">
            <Inline justify="between" align="center">
              <Text as="h2" size="body-lg">
                Criteria
              </Text>
              <Button size="sm" variant="ghost" onClick={addCriterion} disabled={!selectedSource}>
                + Add criterion
              </Button>
            </Inline>
            {draft.criteria.length === 0 ? (
              <Text size="body-sm" color="muted">
                {selectedSource
                  ? "No criteria yet. Add one — leave empty to match every row in the source."
                  : "Pick a source first."}
              </Text>
            ) : (
              <Stack gap="3">
                {draft.criteria.map((c, idx) => {
                  const field = getField(selectedSource, c.field);
                  const opChoices: AudienceOperator[] = field?.operators ?? [];
                  return (
                    <Box key={c._id} border="subtle" p="3" unsafe_className="rounded-md">
                      <Stack gap="2">
                        <Inline gap="3" align="center" wrap>
                          {/* Field */}
                          <select
                            value={c.field}
                            onChange={(e) =>
                              updateCriterion(idx, {
                                field: e.target.value,
                                operator: "",
                                value: null,
                              })
                            }
                            className="rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
                          >
                            {selectedSource?.fields.map((f) => (
                              <option key={f.name} value={f.name}>
                                {f.display}
                              </option>
                            ))}
                          </select>

                          {/* Operator */}
                          <select
                            value={c.operator}
                            onChange={(e) =>
                              updateCriterion(idx, {
                                operator: e.target.value as AudienceOperator,
                                value: defaultValueForOperator(e.target.value as AudienceOperator),
                              })
                            }
                            className="rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-2 py-1 text-body-sm"
                          >
                            <option value="">— operator —</option>
                            {opChoices.map((op) => (
                              <option key={op} value={op}>
                                {OPERATOR_LABELS[op]}
                              </option>
                            ))}
                          </select>

                          {/* Value */}
                          {field && c.operator !== "" && (
                            <ValueInput
                              field={field}
                              operator={c.operator as AudienceOperator}
                              value={c.value}
                              onChange={(next) => updateCriterion(idx, { value: next })}
                            />
                          )}

                          <Button size="sm" variant="ghost" onClick={() => removeCriterion(idx)}>
                            Remove
                          </Button>
                        </Inline>
                        {field?.description && (
                          <Text size="body-sm" color="muted">
                            {field.description}
                          </Text>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Preview the spec — operator can see what's actually getting submitted */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              Spec preview
            </Text>
            <pre className="overflow-x-auto rounded bg-[color:var(--color-surface-raised)] p-3 text-mono-xs">
              {JSON.stringify(
                {
                  title: draft.title,
                  description: draft.description,
                  entity_grain: selectedSource?.entity_grain ?? null,
                  sources: selectedSource ? [{ source_id: selectedSource.source_id }] : [],
                  criteria: draft.criteria
                    .filter((c) => c.field && c.operator)
                    .map((c) => ({
                      field: c.field,
                      operator: c.operator,
                      ...(operatorNeedsValue(c.operator as AudienceOperator)
                        ? { value: c.value }
                        : {}),
                    })),
                },
                null,
                2,
              )}
            </pre>
          </Stack>
        </Box>

        <Inline justify="end" gap="3">
          <Link to="/audiences">
            <Button size="md" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button size="md" onClick={submit} disabled={submitting || !selectedSource}>
            {submitting ? "Saving…" : "Save audience"}
          </Button>
        </Inline>
      </Stack>
    </Page>
  );
}
