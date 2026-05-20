/**
 * Home — the Rare Structure homepage. The single route.
 *
 * The whole page: a full-viewport dark starfield with the "RARE STRUCTURE"
 * wordmark centered in a refined rectangle container. Minimal by intent —
 * an institutional origination firm, not a SaaS landing page. No nav, no
 * feature grid, no marketing copy.
 *
 * This route file authors no page geometry (the `no-route-geometry`
 * discipline): the centering wrapper uses only flex alignment + viewport
 * sizing, and all container geometry lives inside <Wordmark>.
 */

import { Starfield } from "@/components/Starfield";
import { Wordmark } from "@/components/Wordmark";

export default function Home() {
  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[color:var(--color-surface-base)]">
      {/* Animated star field — full-bleed behind everything. */}
      <Starfield />

      {/* A faint vignette grounds the wordmark against the field. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 52% 48% at 50% 48%, transparent 38%, var(--color-surface-base) 100%)",
        }}
      />

      {/* The wordmark container — owns its own geometry. */}
      <div className="relative">
        <Wordmark />
      </div>
    </main>
  );
}
