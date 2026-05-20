/**
 * MatchPhase — Phase 3 of the catalyst map demo: the split-screen.
 *
 * The cascade resolves here. LEFT: the capital partner's thesis card —
 * the firm, the structural thesis, check size, posture, the sectors and
 * geographies and catalyst kinds the thesis is tuned to. RIGHT: the
 * thesis-matched catalysts as a vertical feed, ranked by fit; clicking one
 * opens the deep dive (phase 4).
 *
 * Adapted from the EquipmentWork demo's `RevealPhase`, inverted: there the
 * left panel was a contractor profile and the right was matched federal
 * opportunities. Here it is the partner's thesis and the matched catalysts.
 * Restyled on the `@rare-structure-hq` design system.
 *
 * Reduced motion: the split-screen renders settled, no entrance sweep.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Crosshair, Layers, MapPin, Tag } from "lucide-react";
import { CAPITAL_PARTNER, type DemoCatalyst, MATCHED_CATALYSTS } from "../data";
import { fitTier, kindLabel } from "../format";

export function MatchPhase({
  onSelectCatalyst,
}: {
  onSelectCatalyst: (index: number) => void;
}) {
  const reduced = !!useReducedMotion();

  return (
    <motion.div
      className="relative flex h-screen w-full flex-col overflow-hidden bg-[color:var(--color-surface-base)]"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="rs-scanlines pointer-events-none absolute inset-0 opacity-50" />

      {/* ── Resolved-thesis header band ──────────────────────────────── */}
      <motion.header
        className="relative z-10 flex items-center justify-between gap-4 border-[color:var(--color-border-subtle)] border-b px-6 py-3.5 sm:px-8"
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Crosshair className="size-3.5 shrink-0 text-[color:var(--color-text-accent)]" />
          <span className="truncate font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Thesis resolved · {CAPITAL_PARTNER.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
          <span className="size-1.5 bg-[color:var(--color-accent-primary)]" />
          Matched set ready
        </div>
      </motion.header>

      {/* ── The split ────────────────────────────────────────────────── */}
      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* LEFT — the partner thesis card. */}
        <motion.section
          className="min-h-0 overflow-y-auto border-[color:var(--color-border-subtle)] border-b px-6 py-7 sm:px-8 lg:border-r lg:border-b-0"
          initial={reduced ? false : { opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 0.1 }}
        >
          <ThesisCard />
        </motion.section>

        {/* RIGHT — the matched-catalyst feed. */}
        <motion.section
          className="min-h-0 overflow-y-auto bg-[color:var(--color-surface-raised)] px-6 py-7 sm:px-8"
          initial={reduced ? false : { opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 0.18 }}
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
                <Layers className="size-3.5" />
                This week's matched catalysts
              </div>
              <h2 className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-sm uppercase leading-none tracking-tight">
                {MATCHED_CATALYSTS.length} routed to the thesis
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-sm leading-none tabular-nums">
                {MATCHED_CATALYSTS.length}
              </div>
              <div className="mt-1 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
                open
              </div>
            </div>
          </div>

          <ul className="flex flex-col gap-2.5">
            {MATCHED_CATALYSTS.map((c, i) => (
              <MatchRow
                key={c.event.id}
                catalyst={c}
                index={i}
                reduced={reduced}
                onClick={() => onSelectCatalyst(i)}
              />
            ))}
          </ul>

          <p className="mt-5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Ranked by sector, geography, and catalyst-kind fit · click any catalyst to open it
          </p>
        </motion.section>
      </div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Left panel — the capital partner's thesis.
// ───────────────────────────────────────────────────────────────────

function ThesisCard() {
  const p = CAPITAL_PARTNER;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
        <span className="size-1.5 bg-[color:var(--color-accent-primary)]" />
        Capital partner · the origination thesis
      </div>

      {/* Identity. */}
      <div className="flex items-start gap-4">
        <Seal name={p.name} />
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-md uppercase leading-tight tracking-tight">
            {p.name}
          </h1>
          <div className="mt-2 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            {p.kind}
          </div>
        </div>
      </div>

      {/* The thesis line. */}
      <div className="mt-6 border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] px-4 py-3.5">
        <div className="mb-1.5 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
          Structural thesis
        </div>
        <p className="text-[color:var(--color-text-default)] text-body-sm leading-relaxed">
          {p.thesisLine}
        </p>
      </div>

      {/* Headline thesis facts. */}
      <div className="mt-6 grid grid-cols-2 gap-px border border-[color:var(--color-border-subtle)] bg-[color:var(--color-border-subtle)]">
        <StatCell label="Check size" value={p.checkSize} />
        <StatCell label="Posture" value={p.posture} />
        <StatCell label="Sectors" value={`${p.sectors.length} core`} />
        <StatCell label="Catalyst kinds" value={`${p.catalystKinds.length} tuned`} />
      </div>

      {/* Coverage. */}
      <div className="mt-6">
        <div className="mb-2.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          Thesis coverage
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.sectors.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 border border-[color:var(--color-border-default)] px-2 py-1 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase"
            >
              <Tag className="size-3 text-[color:var(--color-text-accent)]" />
              {s}
            </span>
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {p.catalystKinds.map((k) => (
            <li
              key={k}
              className="border border-[color:var(--color-border-default)] px-2 py-1 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase"
            >
              {kindLabel(k)}
            </li>
          ))}
        </ul>
      </div>

      {/* Geography. */}
      <div className="mt-6 flex items-start gap-2.5 border-[color:var(--color-border-subtle)] border-t pt-4">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[color:var(--color-text-accent)]" />
        <div>
          <div className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Geography
          </div>
          <div className="mt-0.5 text-[color:var(--color-text-primary)] text-body-sm">
            {p.geographies.join(" · ")}
          </div>
        </div>
      </div>
    </div>
  );
}

function Seal({ name }: { name: string }) {
  const initials = name
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (
    <div className="flex size-16 shrink-0 flex-col items-center justify-center border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] sm:size-20">
      <Crosshair className="mb-0.5 size-4 text-[color:var(--color-text-muted)]" />
      <span className="font-display font-semibold text-[color:var(--color-text-primary)] text-body-lg tracking-tight">
        {initials || "—"}
      </span>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-surface-base)] p-3.5">
      <div className="mb-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
        {label}
      </div>
      <div className="font-display font-semibold text-[color:var(--color-text-primary)] text-body-lg leading-tight">
        {value}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Right panel — one matched-catalyst row in the feed.
// ───────────────────────────────────────────────────────────────────

function MatchRow({
  catalyst,
  index,
  reduced,
  onClick,
}: {
  catalyst: DemoCatalyst;
  index: number;
  reduced: boolean;
  onClick: () => void;
}) {
  const { event } = catalyst;

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reduced ? 0 : 0.28 + index * 0.07 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group w-full border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-4 py-3.5 text-left transition-colors hover:border-[color:var(--color-accent-primary)]"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <FitPill score={catalyst.thesisFit} />
          <span className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            {kindLabel(event.kind)}
          </span>
          <span className="font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
            {event.severity}
          </span>
        </div>

        <h3 className="mt-2 font-display font-semibold text-[color:var(--color-text-primary)] text-body-lg leading-tight tracking-tight">
          {event.headline}
        </h3>

        <div className="mt-1 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          {catalyst.subject}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-mono-xs uppercase">
            <span className="flex items-center gap-1 text-[color:var(--color-text-muted)]">
              <MapPin className="size-3 text-[color:var(--color-text-accent)]" />
              {event.location?.region ?? "—"}
            </span>
            <span className="text-[color:var(--color-text-muted)]">{catalyst.scale}</span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Open
            <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function FitPill({ score }: { score: number }) {
  const tier = fitTier(score);
  const cls =
    tier === "high"
      ? "bg-[color:var(--color-accent-primary)] text-[color:var(--color-text-onAccent)]"
      : tier === "mid"
        ? "border border-[color:var(--color-accent-primary)] text-[color:var(--color-text-accent)]"
        : "border border-[color:var(--color-border-default)] text-[color:var(--color-text-muted)]";
  return (
    <span className={`px-1.5 py-0.5 font-mono text-mono-xs uppercase tabular-nums ${cls}`}>
      {score}% fit
    </span>
  );
}
