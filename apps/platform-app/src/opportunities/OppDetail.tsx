/**
 * Opportunity detail route — `/opportunities/:notice_id`. Renders the
 * full DEX detail row in a two-column key/value layout. Description
 * is rendered as-is in a `<pre>` since it sometimes arrives with
 * embedded markup or hard line breaks.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Badge, Box, Button, Card, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";
import { getOppDetail, type OppRow } from "@/lib/api";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return d.length >= 10 ? d.slice(0, 10) : d;
}

function fieldVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toString();
  return JSON.stringify(v);
}

// Ordered field groups to render. Each key references OppRow / detail row
// returned by DEX; missing fields render as "—".
const FIELDS: { label: string; key: keyof OppRow | string }[] = [
  { label: "Notice ID", key: "notice_id" },
  { label: "Notice type", key: "notice_type" },
  { label: "Posted", key: "posted_date" },
  { label: "Response deadline", key: "response_deadline" },
  { label: "Active", key: "active_flag" },
  { label: "Department", key: "department_agency" },
  { label: "Sub-tier", key: "sub_tier" },
  { label: "Office", key: "office" },
  { label: "NAICS code", key: "naics_code" },
  { label: "Classification code", key: "classification_code" },
  { label: "Set-aside code", key: "set_aside_code" },
  { label: "Set-aside description", key: "set_aside_description" },
  { label: "PoP city", key: "pop_city" },
  { label: "PoP state", key: "pop_state" },
  { label: "PoP country", key: "pop_country" },
  { label: "Primary contact name", key: "primary_contact_name" },
  { label: "Primary contact email", key: "primary_contact_email" },
  { label: "Primary contact phone", key: "primary_contact_phone" },
  { label: "Award number", key: "award_number" },
  { label: "Award date", key: "award_date" },
  { label: "Award amount", key: "award_amount" },
  { label: "Awardee", key: "awardee_name" },
];

export default function OppDetail() {
  const { notice_id: noticeId } = useParams<{ notice_id: string }>();
  const [row, setRow] = useState<OppRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getOppDetail(noticeId)
      .then((r) => {
        if (cancelled) return;
        setRow(r);
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
  }, [noticeId]);

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Link to="/opportunities">
            <Button variant="ghost" size="sm">
              ← Back to list
            </Button>
          </Link>
          {row?.link && (
            <a
              href={row.link as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-[color:var(--color-text-accent)] hover:underline"
            >
              View on SAM.gov →
            </a>
          )}
        </Inline>

        {loading && (
          <Text size="body-sm" color="muted">
            Loading opportunity…
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
                {row.notice_type && <Badge tone="default">{row.notice_type}</Badge>}
                {row.set_aside_code && <Badge tone="accent">{row.set_aside_code}</Badge>}
                {row.active_flag === "Yes" && <Badge tone="success">Active</Badge>}
              </Inline>
              <Text as="h1" size="display-sm">
                {row.title ?? "(no title)"}
              </Text>
              <Text size="body-sm" color="muted">
                Posted {fmtDate(row.posted_date)} · Deadline {fmtDate(row.response_deadline)}
              </Text>
            </Stack>

            <Card className="p-6">
              <Stack gap="4">
                <Text size="body-sm" mono color="muted">
                  Details
                </Text>
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                  {FIELDS.map(({ label, key }) => (
                    <Inline key={String(key)} gap="3" align="start" justify="between">
                      <Text size="body-xs" color="muted" mono>
                        {label}
                      </Text>
                      <Text
                        size="body-sm"
                        className="text-right break-all text-[color:var(--color-text-default)]"
                      >
                        {key === "posted_date" ||
                        key === "response_deadline" ||
                        key === "award_date"
                          ? fmtDate(row[key as keyof OppRow] as string | null)
                          : fieldVal(row[key as keyof OppRow])}
                      </Text>
                    </Inline>
                  ))}
                </div>
              </Stack>
            </Card>

            {typeof row.description === "string" && row.description.length > 0 && (
              <Card className="p-6">
                <Stack gap="3">
                  <Text size="body-sm" mono color="muted">
                    Description
                  </Text>
                  <Box
                    bg="sunken"
                    border="subtle"
                    p="4"
                    rounded="xl"
                    unsafe_className="whitespace-pre-wrap text-body-sm leading-relaxed text-[color:var(--color-text-default)]"
                  >
                    {row.description}
                  </Box>
                </Stack>
              </Card>
            )}
          </Stack>
        )}
      </Stack>
    </Page>
  );
}
