/**
 * CampaignDemoView — `/campaigns/demo`. The Campaign Configurator & Demo.
 *
 * A live-call surface that mirrors the legacy 3-pane layout:
 *   - LEFT   (Settings)  — scaffold / spec / brand / target entity / content.
 *   - CENTER (Canvas)    — the solved mailpiece, with a Mailer ⇄ Landing toggle.
 *   - RIGHT  (AI Chat)   — design assistant.
 *
 * It does NOT solve layouts locally: the Settings pane calls dmaas preview /
 * design-create, and the Canvas renders whatever `resolved_positions` the
 * backend returns. State + orchestration live in `useCampaignDemo`.
 */
import { Badge, Box, Flex, Heading, IconButton, SegmentedControl, Text } from "@radix-ui/themes";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ChatSidebar } from "./ChatSidebar";
import { MailpieceCanvas } from "./MailpieceCanvas";
import { SettingsSidebar } from "./SettingsSidebar";
import type { Scaffold } from "./dmaas";
import { type CampaignDemoState, type CanvasView, useCampaignDemo } from "./state";

/** A grounded, deterministic assistant reply derived from current state. This
 *  is the local responder behind the chat seam — swap for the authoring agent
 *  without touching ChatSidebar. */
function assistantReply(text: string, state: CampaignDemoState, scaffold: Scaffold | null): string {
  const q = text.toLowerCase();
  const surface = state.surfaces[state.view];
  const elementNames = surface ? Object.keys(surface.resolved_positions) : [];

  if (state.status === "error" || q.includes("solve") || q.includes("why")) {
    if (state.conflicts.length > 0) {
      const lines = state.conflicts
        .map((c) => `• [${c.phase}] ${c.constraint_type}: ${c.message}`)
        .join("\n");
      return `The solver rejected the last attempt:\n${lines}\n\nTry relaxing the conflicting constraint's content (shorter text reduces intrinsic size) or pick a different spec.`;
    }
    if (state.status === "error" && state.error) return state.error;
  }

  if (!scaffold)
    return "Pick a scaffold on the left to start — I'll explain its specs and what content it expects.";
  if (!surface) {
    return `“${scaffold.name}” (${scaffold.format}) is selected. Set the content props, then hit Generate — the solved layout lands on the canvas and I can help refine it.`;
  }

  if (q.includes("element") || q.includes("layout") || q.includes("what")) {
    return `The ${state.view} view has ${elementNames.length} solved elements: ${elementNames.join(", ")}. Click any block on the canvas to inspect its rect. Layout is solved server-side, so edits go through content + a re-solve.`;
  }

  return `Noted. With “${scaffold.name}” on the ${state.view} surface, adjust the relevant content prop and re-run Generate — the backend re-solves and the canvas updates. (This assistant is the seam for the dmaas authoring agent.)`;
}

export default function CampaignDemoView() {
  const { state, actions, selectedScaffold } = useCampaignDemo();
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    void actions.loadScaffolds();
  }, [actions.loadScaffolds]);

  const surface = state.surfaces[state.view];

  // Selection is only meaningful within the active surface — derive it so it
  // auto-clears on view toggle / re-solve, no reset effect needed.
  const activeSelected =
    selectedElement && surface?.resolved_positions[selectedElement] ? selectedElement : null;
  const selectedRect = activeSelected
    ? (surface?.resolved_positions[activeSelected] ?? null)
    : null;

  return (
    <Flex direction="column" style={{ height: "100vh", background: "var(--color-background)" }}>
      {/* Top bar */}
      <Flex
        align="center"
        justify="between"
        px="4"
        py="2"
        style={{ borderBottom: "1px solid var(--gray-a4)", flexShrink: 0 }}
      >
        <Flex align="center" gap="3" style={{ minWidth: 0 }}>
          <Link to="/">
            <IconButton
              variant="ghost"
              color="gray"
              aria-label="Back to HQ"
              style={{ cursor: "pointer" }}
            >
              <ArrowLeft size={16} />
            </IconButton>
          </Link>
          <Flex align="center" gap="2" style={{ minWidth: 0 }}>
            <LayoutTemplate size={16} />
            <Heading size="4" weight="medium" truncate>
              Campaign Demo
            </Heading>
            {selectedScaffold ? (
              <Text size="2" color="gray" truncate>
                · {selectedScaffold.name}
              </Text>
            ) : null}
          </Flex>
        </Flex>

        <Flex align="center" gap="4">
          {selectedRect ? (
            <Text size="1" color="gray">
              {activeSelected}: {Math.round(selectedRect.w)}×{Math.round(selectedRect.h)} @ (
              {Math.round(selectedRect.x)}, {Math.round(selectedRect.y)})
            </Text>
          ) : null}
          <SegmentedControl.Root
            value={state.view}
            onValueChange={(v) => actions.setView(v as CanvasView)}
            size="1"
          >
            <SegmentedControl.Item value="mailer">Mailer</SegmentedControl.Item>
            <SegmentedControl.Item value="landing">Landing page</SegmentedControl.Item>
          </SegmentedControl.Root>
          {surface?.design_id ? (
            <Badge variant="soft" color="grass" radius="full" size="1">
              saved
            </Badge>
          ) : surface ? (
            <Badge variant="soft" color="blue" radius="full" size="1">
              preview
            </Badge>
          ) : null}
        </Flex>
      </Flex>

      {/* 3-pane body */}
      <Flex flexGrow="1" style={{ minHeight: 0 }}>
        <SettingsSidebar state={state} actions={actions} selectedScaffold={selectedScaffold} />

        <Box style={{ flexGrow: 1, minWidth: 0, minHeight: 0 }}>
          <MailpieceCanvas
            positions={surface?.resolved_positions ?? null}
            canvas={surface?.canvas ?? null}
            zones={surface?.zones}
            mode={state.view}
            content={state.content_config}
            selectedElement={activeSelected}
            onSelectElement={setSelectedElement}
            status={state.status}
            conflicts={state.conflicts}
          />
        </Box>

        <ChatSidebar onSend={async (t) => assistantReply(t, state, selectedScaffold)} />
      </Flex>
    </Flex>
  );
}
