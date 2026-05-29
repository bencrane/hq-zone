/**
 * SessionSidebar — collapsible left rail listing past gtm-agent chats.
 * Click a row to reopen it (events reload from the server by session_id);
 * "New chat" starts a fresh session; per-row ⋯ menu renames or deletes.
 *
 * @radix-ui/themes throughout: Box/Flex/Text, Button, IconButton, ScrollArea,
 * DropdownMenu, TextField.
 */
import {
  Box,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  ScrollArea,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Ellipsis, PanelLeft, PanelLeftClose, Plus } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

import type { AgentRunSummary } from "@/lib/agentRuns";

export interface SessionSidebarProps {
  sessions: AgentRunSummary[];
  activeId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeId,
  collapsed,
  onToggleCollapse,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: SessionSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(s: AgentRunSummary) {
    setRenamingId(s.id);
    setDraft(s.title);
  }
  function commitRename() {
    if (renamingId) onRename(renamingId, draft);
    setRenamingId(null);
    setDraft("");
  }
  function onRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenamingId(null);
      setDraft("");
    }
  }

  // ── Collapsed rail ─────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <Flex
        direction="column"
        align="center"
        gap="2"
        py="3"
        style={{ width: 52, borderRight: "1px solid var(--gray-a4)", flexShrink: 0 }}
      >
        <IconButton
          variant="ghost"
          color="gray"
          size="2"
          onClick={onToggleCollapse}
          aria-label="Expand chats"
        >
          <PanelLeft size={18} />
        </IconButton>
        <IconButton variant="soft" color="grass" size="2" onClick={onNew} aria-label="New chat">
          <Plus size={18} />
        </IconButton>
      </Flex>
    );
  }

  // ── Expanded sidebar ───────────────────────────────────────────────────
  return (
    <Flex
      direction="column"
      style={{ width: 264, borderRight: "1px solid var(--gray-a4)", flexShrink: 0, minHeight: 0 }}
    >
      <Flex
        align="center"
        justify="between"
        px="3"
        py="3"
        style={{ borderBottom: "1px solid var(--gray-a4)" }}
      >
        <Text size="2" weight="medium" color="gray">
          Chats
        </Text>
        <IconButton
          variant="ghost"
          color="gray"
          size="1"
          onClick={onToggleCollapse}
          aria-label="Collapse"
        >
          <PanelLeftClose size={16} />
        </IconButton>
      </Flex>

      <Box px="2" py="2">
        <Button
          variant="soft"
          color="grass"
          size="2"
          radius="large"
          onClick={onNew}
          style={{ width: "100%", justifyContent: "flex-start", cursor: "pointer" }}
        >
          <Plus size={16} /> New chat
        </Button>
      </Box>

      <ScrollArea scrollbars="vertical" style={{ flexGrow: 1, minHeight: 0 }}>
        <Flex direction="column" gap="1" px="2" pb="2">
          {sessions.length === 0 ? (
            <Text size="1" color="gray" style={{ padding: "8px 8px" }}>
              No chats yet. Start one to see it here.
            </Text>
          ) : (
            sessions.map((s) => {
              const active = s.id === activeId;
              if (renamingId === s.id) {
                return (
                  <TextField.Root
                    key={s.id}
                    size="2"
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.currentTarget.value)}
                    onKeyDown={onRenameKey}
                    onBlur={commitRename}
                  />
                );
              }
              return (
                <Box key={s.id} style={{ position: "relative" }}>
                  <Button
                    variant={active ? "soft" : "ghost"}
                    color={active ? "grass" : "gray"}
                    size="2"
                    radius="large"
                    onClick={() => onSelect(s.id)}
                    title={s.title}
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      paddingRight: 32,
                      cursor: "pointer",
                    }}
                  >
                    <Text
                      truncate
                      style={{ display: "block", minWidth: 0, flexGrow: 1, textAlign: "left" }}
                    >
                      {s.title}
                    </Text>
                  </Button>
                  <Box
                    style={{
                      position: "absolute",
                      right: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger>
                        <IconButton variant="ghost" color="gray" size="1" aria-label="Chat options">
                          <Ellipsis size={14} />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content size="1">
                        <DropdownMenu.Item onSelect={() => startRename(s)}>
                          Rename
                        </DropdownMenu.Item>
                        <DropdownMenu.Item color="red" onSelect={() => onDelete(s.id)}>
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </Box>
                </Box>
              );
            })
          )}
        </Flex>
      </ScrollArea>
    </Flex>
  );
}
