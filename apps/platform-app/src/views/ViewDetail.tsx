/**
 * View detail — `/views/:id`. Displays one materialized-view definition:
 * spec, compute count + timestamp (cheap), and materialization metadata
 * (Lance dataset URI, row count, materialized timestamp).
 *
 * Two action buttons:
 *   - Compute    — runs COUNT(DISTINCT pk) on the substrate, no side effect
 *   - Materialize — emits a Lance dataset under polaris-warehouse/views/<slug>_lance/
 *                   and registers it in Polaris. Becomes a first-class source.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { View } from "@rare-structure-hq/shared";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { computeView, deleteView, getView, materializeView } from "./api";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ViewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [computing, setComputing] = useState(false);
  const [materializing, setMaterializing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getView(id)
      .then(setView)
      .catch((e) => setError(String(e)));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Delete this view?")) return;
    setDeleting(true);
    try {
      await deleteView(id);
      navigate("/views");
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(false);
    }
  }

  async function handleCompute() {
    if (!id) return;
    setComputing(true);
    setError(null);
    try {
      const updated = await computeView(id);
      setView(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setComputing(false);
    }
  }

  async function handleMaterialize() {
    if (!id) return;
    setMaterializing(true);
    setError(null);
    try {
      const updated = await materializeView(id);
      setView(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setMaterializing(false);
    }
  }

  if (error) {
    return (
      <Page variant="wide">
        <Stack gap="4">
          <Text as="h1" size="display-sm">
            View
          </Text>
          <Box border="subtle" p="4" unsafe_className="rounded-md">
            <Text size="body-sm" color="muted">
              {error}
            </Text>
          </Box>
          <Link to="/views">
            <Button size="sm" variant="ghost">
              ← Back to views
            </Button>
          </Link>
        </Stack>
      </Page>
    );
  }

  if (!view) {
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
              {view.title}
            </Text>
            {view.description && (
              <Text size="body-md" color="muted">
                {view.description}
              </Text>
            )}
          </Stack>
          <Inline gap="2">
            <Link to="/views">
              <Button size="sm" variant="ghost">
                ← Back
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleCompute} disabled={computing}>
              {computing ? "Computing…" : "Compute"}
            </Button>
            <Button size="sm" onClick={handleMaterialize} disabled={materializing}>
              {materializing ? "Materializing…" : "Materialize"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </Inline>
        </Inline>

        {/* Identity / compute / materialization */}
        <Box border="subtle" p="5" rounded="xl">
          <Stack gap="3">
            <Text as="h2" size="body-lg">
              State
            </Text>
            <Inline gap="6" wrap>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  ENTITY GRAIN
                </Text>
                <Text size="body-md" className="font-mono">
                  {view.entity_grain}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  COMPUTED COUNT
                </Text>
                <Text size="body-md" className="font-mono">
                  {view.computed_count === null
                    ? "— (not yet computed)"
                    : view.computed_count.toLocaleString()}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  LAST COMPUTED
                </Text>
                <Text size="body-md">{fmtDate(view.computed_at)}</Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  MATERIALIZED ROWS
                </Text>
                <Text size="body-md" className="font-mono">
                  {view.row_count === null
                    ? "— (not yet materialized)"
                    : view.row_count.toLocaleString()}
                </Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  LAST MATERIALIZED
                </Text>
                <Text size="body-md">{fmtDate(view.materialized_at)}</Text>
              </Stack>
              <Stack gap="1">
                <Text size="mono-xs" color="muted">
                  CREATED
                </Text>
                <Text size="body-md">{fmtDate(view.created_at)}</Text>
              </Stack>
            </Inline>
            {view.materialized_uri && (
              <Text size="mono-xs" color="muted">
                {view.materialized_uri}
              </Text>
            )}
            <Text size="body-sm" color="muted">
              <strong>Compute</strong> runs COUNT(DISTINCT {view.entity_grain}) on the substrate —
              fast, cheap, no side effect. <strong>Materialize</strong> emits a Lance dataset (BTREE
              on {view.entity_grain}, registered in Polaris under the <code>views</code> namespace)
              that other views can use as a source.
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
              {view.sources.map((s) => (
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
            {view.criteria.length === 0 ? (
              <Text size="body-sm" color="muted">
                No criteria — matches every row in the source.
              </Text>
            ) : (
              <Stack gap="2">
                {view.criteria.map((c) => (
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
              {JSON.stringify(view, null, 2)}
            </pre>
          </Stack>
        </Box>
      </Stack>
    </Page>
  );
}
