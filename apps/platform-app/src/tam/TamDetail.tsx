/**
 * TAM person detail route — `/tam/:person_id`. Renders the lead row
 * with both person and company context.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Badge, Button, Card, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { getTamDetail, type TamRow } from "./api";
import { EMPLOYEE_BANDS, REVENUE_BANDS, SENIORITY_BANDS } from "./constants";

const employeeLabel = new Map(EMPLOYEE_BANDS.map((b) => [b.value, b.label]));
const revenueLabel = new Map(REVENUE_BANDS.map((b) => [b.value, b.label]));
const seniorityLabel = new Map(SENIORITY_BANDS.map((b) => [b.value, b.label]));

function fieldVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  return JSON.stringify(v);
}

export default function TamDetail() {
  const { person_id: personId } = useParams<{ person_id: string }>();
  const [row, setRow] = useState<TamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getTamDetail(personId)
      .then((r) => {
        if (cancelled) return;
        setRow(r);
        if (!r) setErr("not found");
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "detail failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const personFields: { label: string; value: string }[] = row
    ? [
        { label: "Title", value: fieldVal(row.title) },
        { label: "Seniority", value: seniorityLabel.get(row.seniority_band) ?? row.seniority_band },
        { label: "Function", value: fieldVal(row.function) },
        { label: "Email", value: fieldVal(row.email) },
        { label: "LinkedIn", value: fieldVal(row.linkedin) },
        { label: "Location", value: row.person_locality ? `${row.person_locality}, ${row.person_state ?? "—"}` : row.person_state ?? "—" },
      ]
    : [];

  const companyFields: { label: string; value: string }[] = row
    ? [
        { label: "Company", value: fieldVal(row.company_name) },
        { label: "Industry", value: fieldVal(row.industry) },
        { label: "Employees", value: row.employee_band ? employeeLabel.get(row.employee_band) ?? row.employee_band : "—" },
        { label: "Est. revenue", value: row.revenue_band ? revenueLabel.get(row.revenue_band) ?? row.revenue_band : "—" },
        { label: "Founded", value: fieldVal(row.founded_year) },
        { label: "HQ", value: row.company_hq_locality ? `${row.company_hq_locality}, ${row.company_hq_state ?? "—"}` : row.company_hq_state ?? "—" },
        { label: "Website", value: fieldVal(row.website) },
      ]
    : [];

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Link to="/tam">
            <Button variant="ghost" size="sm">
              ← Back to TAM
            </Button>
          </Link>
          {row?.linkedin && (
            <a
              href={`https://${row.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-[color:var(--color-text-accent)] hover:underline"
            >
              {row.linkedin} →
            </a>
          )}
        </Inline>

        {loading && (
          <Text size="body-sm" color="muted">
            Loading lead…
          </Text>
        )}

        {err && (
          <Text size="body-sm" className="text-[color:var(--color-state-error)]">
            {err}
          </Text>
        )}

        {row && (
          <Stack gap="6">
            <Stack gap="2">
              <Inline gap="2" align="center" wrap>
                <Badge tone="default">{seniorityLabel.get(row.seniority_band) ?? row.seniority_band}</Badge>
                <Badge tone="accent">{row.function}</Badge>
              </Inline>
              <Text as="h1" size="display-sm">
                {row.full_name}
              </Text>
              <Text size="body-sm" color="muted">
                {row.title} · {row.company_name}
              </Text>
            </Stack>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <Stack gap="4">
                  <Text size="body-sm" mono color="muted">
                    Person
                  </Text>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3">
                    {personFields.map((f) => (
                      <Inline key={f.label} gap="3" align="start" justify="between">
                        <Text size="body-xs" color="muted" mono>
                          {f.label}
                        </Text>
                        <Text
                          size="body-sm"
                          className="text-right break-all text-[color:var(--color-text-default)]"
                        >
                          {f.value}
                        </Text>
                      </Inline>
                    ))}
                  </div>
                </Stack>
              </Card>

              <Card className="p-6">
                <Stack gap="4">
                  <Text size="body-sm" mono color="muted">
                    Company
                  </Text>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3">
                    {companyFields.map((f) => (
                      <Inline key={f.label} gap="3" align="start" justify="between">
                        <Text size="body-xs" color="muted" mono>
                          {f.label}
                        </Text>
                        <Text
                          size="body-sm"
                          className="text-right break-all text-[color:var(--color-text-default)]"
                        >
                          {f.value}
                        </Text>
                      </Inline>
                    ))}
                  </div>
                </Stack>
              </Card>
            </div>
          </Stack>
        )}
      </Stack>
    </Page>
  );
}
