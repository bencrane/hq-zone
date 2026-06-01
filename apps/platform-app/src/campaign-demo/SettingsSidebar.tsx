/**
 * SettingsSidebar — the Settings pane (left).
 *
 * Drives the four configurator inputs: scaffold (+ its compatible spec), brand,
 * the target entity from the lake, and the content props. Two solve actions:
 *   - Preview  → dmaas /preview (no write) — fast live iteration on a call.
 *   - Generate → dmaas /designs (persist)  — the commit; returns a design_id.
 *
 * Selection only. All layout solving is server-side; this pane never computes
 * positions.
 */
import {
  Badge,
  Box,
  Button,
  Callout,
  Code,
  Flex,
  Heading,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Layers, Play, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { Scaffold } from "./dmaas";
import type { CampaignDemoActions, CampaignDemoState, TargetEntityData } from "./state";

/** A demo target pulled "from the lake" — stands in for a resolved entity
 *  (gtm.people row / resolved company) until an entity picker is wired. */
const SAMPLE_ENTITY: TargetEntityData = {
  entity_id: "00000000-0000-0000-0000-0000000000aa",
  entity_type: "company",
  display_name: "Cascade Defense Systems",
  headline: "Precision components for defense primes",
  offer: "Free supply-chain audit",
  cta: "Book a 15-min audit",
  address_city: "Dayton",
  address_state: "OH",
};

const SPEC_SEP = "::";

export function SettingsSidebar({
  state,
  actions,
  selectedScaffold,
}: {
  state: CampaignDemoState;
  actions: CampaignDemoActions;
  selectedScaffold: Scaffold | null;
}) {
  const [contentDraft, setContentDraft] = useState<string>("{}");
  const [contentValid, setContentValid] = useState(true);

  // Mirror content_config into the editor when it changes from outside (e.g.
  // loading a sample entity seeds it).
  useEffect(() => {
    setContentDraft(JSON.stringify(state.content_config, null, 2));
    setContentValid(true);
  }, [state.content_config]);

  function onContentChange(next: string) {
    setContentDraft(next);
    try {
      const parsed = JSON.parse(next) as Record<string, unknown>;
      setContentValid(true);
      actions.setContent(parsed);
    } catch {
      setContentValid(false);
    }
  }

  const specValue = state.spec ? `${state.spec.category}${SPEC_SEP}${state.spec.variant}` : "";
  const canSolve = Boolean(selectedScaffold && state.spec) && state.status !== "solving";
  const solving = state.status === "solving";

  return (
    <Flex
      direction="column"
      style={{ width: 320, flexShrink: 0, borderRight: "1px solid var(--gray-a4)", minHeight: 0 }}
    >
      <Flex
        align="center"
        gap="2"
        px="4"
        py="3"
        style={{ borderBottom: "1px solid var(--gray-a4)" }}
      >
        <Layers size={15} />
        <Heading size="3" weight="medium">
          Configure
        </Heading>
      </Flex>

      <ScrollArea scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
        <Flex direction="column" gap="5" p="4">
          {/* 1. Scaffold */}
          <Field label="Scaffold" hint="Layout template from the dmaas catalog.">
            <Select.Root
              value={state.selected_scaffold_id ?? ""}
              onValueChange={actions.selectScaffold}
              disabled={state.scaffolds.length === 0}
            >
              <Select.Trigger
                placeholder={
                  state.scaffolds.length === 0 ? "No scaffolds loaded" : "Pick a scaffold…"
                }
                style={{ width: "100%" }}
              />
              <Select.Content position="popper">
                {state.scaffolds.map((s) => (
                  <Select.Item key={s.id} value={s.id}>
                    {s.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            {selectedScaffold ? (
              <Flex gap="1" wrap="wrap" mt="1">
                <Badge variant="soft" color="gray" size="1">
                  {selectedScaffold.format}
                </Badge>
                {selectedScaffold.strategy ? (
                  <Badge variant="soft" color="iris" size="1">
                    {selectedScaffold.strategy}
                  </Badge>
                ) : null}
                {selectedScaffold.vertical_tags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="soft" color="gray" size="1">
                    {t}
                  </Badge>
                ))}
              </Flex>
            ) : null}
            {selectedScaffold?.description ? (
              <Text size="1" color="gray" mt="1">
                {selectedScaffold.description}
              </Text>
            ) : null}
          </Field>

          {/* 2. Spec (category/variant) */}
          {selectedScaffold ? (
            <Field label="Spec" hint="The direct-mail (category, variant) to solve against.">
              <Select.Root
                value={specValue}
                onValueChange={(v) => {
                  const [category, variant] = v.split(SPEC_SEP);
                  if (category && variant) actions.setSpec({ category, variant });
                }}
                disabled={selectedScaffold.compatible_specs.length === 0}
              >
                <Select.Trigger placeholder="Pick a spec…" style={{ width: "100%" }} />
                <Select.Content position="popper">
                  {selectedScaffold.compatible_specs.map((cs) => (
                    <Select.Item
                      key={`${cs.category}${SPEC_SEP}${cs.variant}`}
                      value={`${cs.category}${SPEC_SEP}${cs.variant}`}
                    >
                      {cs.category} / {cs.variant}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field>
          ) : null}

          <Separator size="4" />

          {/* 3. Brand */}
          <Field label="Brand ID" hint="Binds the design to a brand (UUID).">
            <TextField.Root
              value={state.brand_id ?? ""}
              onChange={(e) => actions.setBrand(e.currentTarget.value || null)}
              placeholder="brand uuid (optional)"
            />
          </Field>

          {/* 4. Target entity (from the lake) */}
          <Field
            label="Target entity"
            hint="Resolved entity from the LanceDB / Polaris lake — its fields fill the content."
          >
            {state.target_entity_data ? (
              <Box style={{ border: "1px solid var(--gray-a4)", borderRadius: 6, padding: 8 }}>
                <Text size="2" weight="medium" as="div">
                  {state.target_entity_data.display_name ??
                    state.target_entity_data.entity_id ??
                    "entity"}
                </Text>
                {state.target_entity_data.entity_type ? (
                  <Badge variant="soft" color="grass" size="1" mt="1">
                    {state.target_entity_data.entity_type}
                  </Badge>
                ) : null}
              </Box>
            ) : (
              <Button
                variant="soft"
                color="gray"
                onClick={() => actions.setTargetEntity(SAMPLE_ENTITY)}
              >
                <Wand2 size={14} /> Load sample target
              </Button>
            )}
          </Field>

          {/* 5. Content props */}
          <Field
            label="Content"
            hint="Props keyed by element name. Validated server-side against the scaffold's prop_schema."
          >
            <textarea
              value={contentDraft}
              onChange={(e) => onContentChange(e.target.value)}
              rows={8}
              spellCheck={false}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--gray-12)",
                background: "var(--color-surface)",
                border: `1px solid ${contentValid ? "var(--gray-a5)" : "var(--tomato-7)"}`,
                borderRadius: 6,
                padding: 8,
              }}
            />
            {!contentValid ? (
              <Text size="1" color="tomato" mt="1">
                Invalid JSON — last valid value is kept.
              </Text>
            ) : null}
          </Field>
        </Flex>
      </ScrollArea>

      {/* Actions */}
      <Flex
        direction="column"
        gap="2"
        p="3"
        style={{ borderTop: "1px solid var(--gray-a4)", flexShrink: 0 }}
      >
        {state.status === "error" && state.error ? (
          <Callout.Root color="tomato" size="1">
            <Callout.Text>{state.error}</Callout.Text>
          </Callout.Root>
        ) : null}
        <Flex gap="2">
          <Button
            variant="soft"
            color="gray"
            style={{ flex: 1 }}
            disabled={!canSolve}
            onClick={() => actions.preview()}
          >
            <Play size={14} /> Preview
          </Button>
          <Button style={{ flex: 1 }} disabled={!canSolve} onClick={() => actions.generate()}>
            <Sparkles size={14} /> {solving ? "Solving…" : "Generate"}
          </Button>
        </Flex>
        {state.surfaces[state.view]?.design_id ? (
          <Text size="1" color="gray">
            design <Code variant="ghost">{state.surfaces[state.view]?.design_id?.slice(0, 8)}</Code>{" "}
            · {state.view}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  );
}

function Field({
  label,
  hint,
  children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="1">
      <Text size="2" weight="medium">
        {label}
      </Text>
      {hint ? (
        <Text size="1" color="gray" mb="1">
          {hint}
        </Text>
      ) : null}
      {children}
    </Flex>
  );
}
