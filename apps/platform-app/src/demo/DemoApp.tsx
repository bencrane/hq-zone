/**
 * DemoApp — orchestrates the catalyst map demo.
 *
 * The walkthrough is a four-moment sequence, an inverted adaptation of the
 * EquipmentWork demo (catalyst events as the plotted points, a capital
 * partner as the viewer):
 *
 *   map      MapPhase        the Catalyst Origination Terminal (US map)
 *      │     + ThesisPalette ⌘K palette floats over the map
 *      ▼
 *   filter   FilterPhase     staged cascade — the firehose down to the thesis
 *      ▼
 *   match    MatchPhase      split-screen: partner thesis + matched catalysts
 *      ▼
 *   deliver  DeliverPhase    one catalyst blown up — why it fits the thesis
 *            + OutroGate     blur gate over the data → the pipeline CTA
 *
 * ⌘K (or Ctrl+K) opens the thesis palette while on the map; Esc closes it.
 * Phase transitions are choreographed with AnimatePresence.
 *
 * This component owns the whole demo surface. The route that renders it
 * (`src/routes/MapDemo.tsx`) authors no geometry.
 */

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ThesisPalette } from "./components/ThesisPalette";
import { DeliverPhase } from "./phases/DeliverPhase";
import { FilterPhase } from "./phases/FilterPhase";
import { MapPhase } from "./phases/MapPhase";
import { MatchPhase } from "./phases/MatchPhase";
import type { DemoPhase } from "./types";

export function DemoApp() {
  const [phase, setPhase] = useState<DemoPhase>("map");
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Index of the catalyst opened in phase 4 (null = none yet).
  const [selectedCatalyst, setSelectedCatalyst] = useState<number | null>(null);

  // ⌘K only arms on the map phase — once the cascade is running the palette
  // is out of the picture.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phase !== "map") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  // Thesis run in the palette → close it, start the cascade.
  const handleRunThesis = useCallback(() => {
    setPaletteOpen(false);
    setPhase("filter");
  }, []);

  // Cascade complete → the split-screen match.
  const handleFilterComplete = useCallback(() => {
    setPhase("match");
  }, []);

  // A catalyst clicked in the match feed → deep-dive deliver.
  const handleSelectCatalyst = useCallback((index: number) => {
    setSelectedCatalyst(index);
    setPhase("deliver");
  }, []);

  // Back out of the deliver view → return to the match feed.
  const handleCloseDeliver = useCallback(() => {
    setSelectedCatalyst(null);
    setPhase("match");
  }, []);

  return (
    <div
      data-demo-phase={phase}
      className="relative h-screen w-full overflow-hidden bg-[color:var(--color-surface-base)]"
    >
      <AnimatePresence mode="wait">
        {phase === "map" && <MapPhase key="map" onInvokeThesis={() => setPaletteOpen(true)} />}
        {phase === "filter" && <FilterPhase key="filter" onComplete={handleFilterComplete} />}
        {phase === "match" && <MatchPhase key="match" onSelectCatalyst={handleSelectCatalyst} />}
        {phase === "deliver" && selectedCatalyst !== null && (
          <DeliverPhase
            key="deliver"
            catalystIndex={selectedCatalyst}
            onClose={handleCloseDeliver}
          />
        )}
      </AnimatePresence>

      <ThesisPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onRun={handleRunThesis}
      />
    </div>
  );
}
