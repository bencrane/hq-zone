/**
 * "Save to list" dialog. Two modes in one dialog: pick an existing
 * list (from localStorage-backed leadLists store), or create a new
 * one. Persists to localStorage immediately; closes on save.
 */
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addToList,
  createList,
  listLists,
  subscribe,
  type LeadList,
} from "@/lib/leadLists";

interface SaveToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personIds: string[];
  onSaved?: (list: LeadList) => void;
}

export function SaveToListDialog({
  open,
  onOpenChange,
  personIds,
  onSaved,
}: SaveToListDialogProps) {
  const [lists, setLists] = useState<LeadList[]>(() => listLists());
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName] = useState("");

  useEffect(() => subscribe(setLists), []);

  // When the dialog opens, default to "new" if there are no lists yet,
  // otherwise default to "existing" with the most-recent list pre-picked.
  useEffect(() => {
    if (!open) return;
    if (lists.length === 0) {
      setMode("new");
      setNewName("");
    } else {
      setMode("existing");
      setSelectedId(lists[0]?.id ?? "");
    }
  }, [open, lists]);

  function handleSave() {
    let saved: LeadList | null = null;
    if (mode === "new") {
      const name = newName.trim();
      if (!name) return;
      saved = createList(name, personIds);
    } else {
      if (!selectedId) return;
      saved = addToList(selectedId, personIds);
    }
    if (saved && onSaved) onSaved(saved);
    onOpenChange(false);
  }

  const canSave =
    mode === "new" ? newName.trim().length > 0 : selectedId.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save {personIds.length} to a list</DialogTitle>
          <DialogDescription>
            Lead lists hold a bag of people. Use them to drive campaigns later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 pt-2 text-xs uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setMode("existing")}
            disabled={lists.length === 0}
            className={`rounded-md border px-3 py-1.5 ${
              mode === "existing"
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/15 text-white/60 hover:text-white"
            } disabled:opacity-40`}
          >
            Existing list
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-md border px-3 py-1.5 ${
              mode === "new"
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/15 text-white/60 hover:text-white"
            }`}
          >
            New list
          </button>
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            <Label htmlFor="list-picker">Pick a list</Label>
            <select
              id="list-picker"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              {lists.length === 0 && <option value="">No lists yet</option>}
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.person_ids.length})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="list-name">List name</Label>
            <Input
              id="list-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. VPs of Sales — Q3 outbound"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) handleSave();
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
