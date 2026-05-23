/**
 * "+ column" dialog. Lists recipes that apply to the table's kind.
 * On confirm: adds the recipe's output columns to the table, marks
 * every existing row's new cells as "pending", then kicks off the
 * recipe per-row. As each row completes, setCell writes the result
 * and the table view re-renders.
 */
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { recipesFor, type Recipe } from "@/lib/recipes";
import {
  addColumn,
  newColumnId,
  setCell,
  setCellsBatch,
  type Cell,
  type Column,
  type Table,
} from "@/lib/tables";

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table;
}

export function AddColumnDialog({ open, onOpenChange, table }: AddColumnDialogProps) {
  const available = recipesFor(table.kind);
  const [pickedId, setPickedId] = useState<string>(available[0]?.id ?? "");
  const [running, setRunning] = useState(false);

  function runRecipe(recipe: Recipe) {
    // 1) Create one output column per recipe output.
    const created: Column[] = recipe.outputs.map((out) => ({
      id: `${newColumnId()}_${out.key}`,
      name: out.name,
      kind: "enrichment",
      recipe_id: recipe.id,
      data_type: out.data_type,
    }));
    for (const c of created) addColumn(table.id, c);

    // 2) Mark every row's new cells as pending.
    const pendingUpdates = table.rows.flatMap((r) =>
      created.map((c) => ({
        rowId: r.id,
        columnId: c.id,
        cell: { value: null, status: "pending" } as Cell,
      })),
    );
    setCellsBatch(table.id, pendingUpdates);

    // 3) Kick off the recipe per row. Each row writes its results back
    //    as it completes — the table view subscribes and re-renders.
    for (const row of table.rows) {
      recipe
        .run(row, table.rows)
        .then((cells) => {
          cells.forEach((cell, i) => {
            const col = created[i];
            if (!col) return;
            setCell(table.id, row.id, col.id, cell);
          });
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e.message : String(e);
          created.forEach((col) => {
            setCell(table.id, row.id, col.id, {
              value: null,
              status: "error",
              provider: recipe.provider,
              error,
              enriched_at: new Date().toISOString(),
            });
          });
        });
    }
  }

  function handleConfirm() {
    const recipe = available.find((r) => r.id === pickedId);
    if (!recipe) return;
    setRunning(true);
    runRecipe(recipe);
    onOpenChange(false);
    setRunning(false);
  }

  const picked = available.find((r) => r.id === pickedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add enrichment column</DialogTitle>
          <DialogDescription>
            Each recipe runs once per row and writes one or more columns to the table.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
          <div className="max-h-80 space-y-1 overflow-y-auto pr-2">
            {available.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setPickedId(r.id)}
                className={`block w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  pickedId === r.id
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 hover:border-white/25 hover:bg-white/5"
                }`}
              >
                <div className="text-sm text-white">{r.name}</div>
                <div className="text-xs text-white/50">{r.provider}</div>
              </button>
            ))}
          </div>
          <div className="rounded-md border border-white/10 p-3">
            {picked ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Provider
                  </div>
                  <div className="text-white">{picked.provider}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Description
                  </div>
                  <div className="text-white/80">{picked.description}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Reads from
                  </div>
                  <div className="text-white/80">{picked.reads_from.join(", ")}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    Writes
                  </div>
                  <ul className="space-y-0.5 text-white/80">
                    {picked.outputs.map((o) => (
                      <li key={o.key}>· {o.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-white/40">
                  Will run on {table.rows.length}{" "}
                  {table.rows.length === 1 ? "row" : "rows"}.
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/50">No recipe selected.</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!picked || running || table.rows.length === 0}>
            Run on {table.rows.length} {table.rows.length === 1 ? "row" : "rows"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
