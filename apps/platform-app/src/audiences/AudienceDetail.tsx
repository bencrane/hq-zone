/**
 * Audience detail — `/audiences/:id`. Read-display of one persisted
 * audience's spec + identity + materialization metadata.
 *
 * Compute path (turning the spec into a member count or member-set)
 * lands in a separate cycle. For v1 the detail view just shows what
 * was authored.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { Audience } from "@rare-structure-hq/shared";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { deleteAudience, getAudience } from "./api";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AudienceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAudience(id)
      .then(setAudience)
      .catch((e) => setError(String(e)));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Delete this audience?")) return;
    setDeleting(true);
    try {
      await deleteAudience(id);
      navigate("/audiences");
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <Page variant="wide">
        <Stack gap="4">
          <Text as="h1" size="display-sm">
            Audience
          </Text>
          <Box border="subtle" p="4" unsafe_className="rounded-md">
            <Text size="body-sm" color="muted">
              {error}
            </Text>
          </Box>
          <Link to="/audiences">
            <Button size="sm" variant="ghost">
              ← Back to audiences
            </Button>
          </Link>
        </Stack>
      </Page>
    );
  }

  if (!audience) {
    return (
      <Page variant="wide">
        <Text size="body-sm" color="muted">
          Loading…
        </Text>
      </Page>
    );
  }

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Inline justify="between" align="center">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              {audience.title}
            </Text>
            {audience.description && (
              <Text size="body-md" color="muted">
                {audience.description}
              </Text>
            )}
          </Stack>
          <Inline gap="2">
            <Link to="/audiences">
              <Button size="sm" variant="ghost">
                ← Back
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </Inline>
        </Inline>

        {/* Identity / materialization */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              Materialization
            </Text>
            <Inline gap="6" wrap>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  ENTITY GRAIN
                </Text>
                <Text size="body-md" className="font-mono">
                  {audience.entity_grain}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  COMPUTED COUNT
                </Text>
                <Text size="body-md" className="font-mono">
                  {audience.computed_count === null
                    ? "— (not yet computed)"
                    : audience.computed_count.toLocaleString()}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  LAST COMPUTED
                </Text>
                <Text size="body-md">{fmtDate(audience.computed_at)}</Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  CREATED
                </Text>
                <Text size="body-md">{fmtDate(audience.created_at)}</Text>
              </Stack>
            </Inline>
            <Text size="body-sm" color="muted">
              Compute path (spec → membership count → member rows) lands separately. The persisted
              spec is the contract; running it is the next surface.
            </Text>
          </Stack>
        </Box>

        {/* Sources */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              Sources
            </Text>
            <Stack gap="2">
              {audience.sources.map((s) => (
                <Text key={s.source_id} size="body-md" className="font-mono">
                  {s.source_id}
                </Text>
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Criteria */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              Criteria
            </Text>
            {audience.criteria.length === 0 ? (
              <Text size="body-sm" color="muted">
                No criteria — matches every row in the source.
              </Text>
            ) : (
              <Stack gap="2">
                {audience.criteria.map((c) => (
                  <Box
                    key={`${c.field}-${c.operator}-${JSON.stringify(c.value ?? null)}`}
                    border="subtle"
                    p="3"
                    unsafe_className="rounded-md"
                  >
                    <Text size="body-sm" className="font-mono">
                      {c.field} {c.operator}
                      {c.value !== undefined ? ` ${JSON.stringify(c.value)}` : ""}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Raw spec for export / debugging */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              Spec (raw)
            </Text>
            <pre className="overflow-x-auto rounded bg-[color:var(--color-surface-raised)] p-3 text-mono-xs">
              {JSON.stringify(audience, null, 2)}
            </pre>
          </Stack>
        </Box>
      </Stack>
    </Page>
  );
}
