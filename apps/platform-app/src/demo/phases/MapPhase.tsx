/**
 * MapPhase — Phase 1 of the catalyst map demo: the opening moment.
 *
 * The Catalyst Origination Terminal. The base layer is a real cartographic
 * US — state outline geometry projected from public-domain Census TIGER data
 * (see `us-geo.ts`), rendered as SVG <path>s with the lower-48 plus AK / HI
 * insets. Layered on it: a scatter field (the catalyst-firehose volume) and
 * the clickable plotted catalysts. Clicking a catalyst lights it up and
 * shoots out a callout; clicking the callout opens the detail modal. ⌘K
 * opens the thesis palette — the seam to phase 2.
 *
 * Adapted from the EquipmentWork demo's `MapPhase`, inverted to the catalyst
 * model and restyled on the `@rare-structure-hq` design system: token CSS
 * variables fill every stroke/fill (utility classes don't reach into SVG).
 *
 * The interactive map is the non-negotiable core of this demo. Dummy data
 * only; operator-driven — real clicks, real ⌘K, no autoplay.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Crosshair } from "lucide-react";
import { useState } from "react";
import { CatalystModal } from "../components/CatalystModal";
import {
  ACTIVE_CATALYST_COUNT,
  type DemoCatalyst,
  PLOTTED_CATALYSTS,
  type PlottedCatalyst,
} from "../data";
import { GEO_SCATTER_BANDS, GEO_VIEW, STATE_PATHS } from "../us-geo";

const CALLOUT_CONNECTOR = 40;
const CALLOUT_W = 280;
const CALLOUT_H = 78;

export function MapPhase({ onInvokeThesis }: { onInvokeThesis: () => void }) {
  const reduced = !!useReducedMotion();
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());
  // The catalyst whose detail modal is open (null = none). Opened by
  // clicking a callout — not the point itself.
  const [selected, setSelected] = useState<DemoCatalyst | null>(null);

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      className="relative flex h-screen w-full flex-col overflow-hidden"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      {/* Ambient depth — faint accent glow + terminal scanlines. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 64% 56% at 50% 48%, var(--color-accent-soft), transparent 74%)",
        }}
      />
      <div className="rs-scanlines pointer-events-none absolute inset-0 opacity-60" />

      <TerminalHeader reduced={reduced} />

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
        <svg
          viewBox={`0 0 ${GEO_VIEW.w} ${GEO_VIEW.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full max-w-[1480px]"
          role="img"
          aria-label="Map of live catalyst events across the United States"
        >
          <defs>
            <radialGradient id="rs-map-landglow" cx="50%" cy="48%" r="62%">
              <stop offset="0%" stopColor="var(--color-surface-raised)" />
              <stop offset="100%" stopColor="var(--color-surface-sunken)" />
            </radialGradient>
            <filter id="rs-map-hotglow" x="-160%" y="-160%" width="420%" height="420%">
              <feGaussianBlur stdDeviation="3.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <Graticule reduced={reduced} />

          {/* ── Cartographic base: real US geometry ────────────────── */}
          <motion.g
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Land fill — one wash under every state. */}
            {STATE_PATHS.map((s) => (
              <path key={`fill-${s.id}`} d={s.d} fill="url(#rs-map-landglow)" />
            ))}
            {/* State borders — the fidelity tell vs. a dot blob. */}
            {STATE_PATHS.map((s, i) => (
              <motion.path
                key={`line-${s.id}`}
                d={s.d}
                fill="none"
                stroke="var(--color-border-default)"
                strokeWidth={0.7}
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: reduced ? 0 : 0.9,
                  delay: reduced ? 0 : 0.1 + (i % 12) * 0.018,
                  ease: "easeInOut",
                }}
              />
            ))}
            {/* National edge — a brighter outer trace on top of borders. */}
            {STATE_PATHS.map((s) => (
              <path
                key={`edge-${s.id}`}
                d={s.d}
                fill="none"
                stroke="var(--color-text-muted)"
                strokeOpacity={0.28}
                strokeWidth={0.5}
                strokeLinejoin="round"
              />
            ))}
          </motion.g>

          {/* ── Scatter field: the catalyst-firehose volume ─────────── */}
          {GEO_SCATTER_BANDS.map((band, b) => (
            <motion.g
              key={`band-${band[0]?.id ?? b}`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 0.5 + b * 0.12 }}
            >
              {band.map((d) => (
                <circle
                  key={d.id}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill="var(--color-text-subtle)"
                  fillOpacity={d.opacity}
                />
              ))}
            </motion.g>
          ))}

          {/* ── Plotted catalysts: the clickable points ─────────────── */}
          {PLOTTED_CATALYSTS.map((pc) => (
            <CatalystPointView
              key={pc.point.id}
              plotted={pc}
              active={active.has(pc.point.id)}
              reduced={reduced}
              onToggle={() => toggle(pc.point.id)}
              onOpenModal={() => setSelected(pc.catalyst)}
            />
          ))}
        </svg>

        <InsetLabels reduced={reduced} />
      </div>

      <SearchPill reduced={reduced} onClick={onInvokeThesis} />

      <CatalystModal catalyst={selected} onClose={() => setSelected(null)} />
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Graticule — a faint lat/lon grid behind the map, terminal texture.
// ───────────────────────────────────────────────────────────────────

function Graticule({ reduced }: { reduced: boolean }) {
  const cols = 9;
  const rows = 5;
  const lines: React.ReactNode[] = [];
  for (let c = 1; c < cols; c++) {
    const x = (GEO_VIEW.w / cols) * c;
    lines.push(
      <line
        key={`gv-${c}`}
        x1={x}
        y1={0}
        x2={x}
        y2={GEO_VIEW.h}
        stroke="var(--color-border-subtle)"
        strokeWidth={0.5}
      />,
    );
  }
  for (let r = 1; r < rows; r++) {
    const y = (GEO_VIEW.h / rows) * r;
    lines.push(
      <line
        key={`gh-${r}`}
        x1={0}
        y1={y}
        x2={GEO_VIEW.w}
        y2={y}
        stroke="var(--color-border-subtle)"
        strokeWidth={0.5}
      />,
    );
  }
  return (
    <motion.g
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 0.5 }}
      transition={{ duration: 0.8 }}
    >
      {lines}
    </motion.g>
  );
}

// ───────────────────────────────────────────────────────────────────
// Terminal header.
// ───────────────────────────────────────────────────────────────────

function TerminalHeader({ reduced }: { reduced: boolean }) {
  return (
    <motion.header
      className="relative z-10 flex items-start justify-between px-6 pt-6 sm:px-10 sm:pt-8"
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div>
        <div className="font-display font-semibold text-[color:var(--color-text-primary)] text-body-lg uppercase tracking-[0.18em]">
          Rare Structure
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          <Crosshair className="size-3 text-[color:var(--color-text-accent)]" />
          Catalyst Origination Terminal
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
          <span className="size-1.5 animate-pulse bg-[color:var(--color-accent-primary)]" />
          Live
        </div>
        <div className="mt-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase tabular-nums">
          {ACTIVE_CATALYST_COUNT.toLocaleString()} catalysts tracked
        </div>
      </div>
    </motion.header>
  );
}

// ───────────────────────────────────────────────────────────────────
// Inset labels — name the AK / HI insets so the map reads as deliberate.
// ───────────────────────────────────────────────────────────────────

function InsetLabels({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute bottom-6 left-6 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase sm:bottom-8 sm:left-10"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 0.7 }}
      transition={{ duration: 0.5, delay: reduced ? 0 : 1.4 }}
    >
      AK · HI shown as insets
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Catalyst point — clickable; lights up + draws a callout.
// ───────────────────────────────────────────────────────────────────

function CatalystPointView({
  plotted,
  active,
  reduced,
  onToggle,
  onOpenModal,
}: {
  plotted: PlottedCatalyst;
  active: boolean;
  reduced: boolean;
  onToggle: () => void;
  onOpenModal: () => void;
}) {
  const { point } = plotted;
  const enterDelay = reduced ? 0 : 1.2 + (point.x / GEO_VIEW.w) * 0.45;

  return (
    // biome-ignore lint/a11y/useSemanticElements: this is an SVG <g>, not HTML — it cannot be a <button>; role="button" + tabIndex + onKeyDown is the correct keyboard-accessible pattern for an interactive SVG group.
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`Catalyst — ${plotted.catalyst.subject}`}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: enterDelay }}
      style={{ cursor: "pointer" }}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Pulse ring — signals "clickable / live". */}
      {!reduced && (
        <motion.circle
          cx={point.x}
          cy={point.y}
          r={5}
          fill="none"
          stroke="var(--color-accent-primary)"
          strokeWidth={1.2}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0.55, 0, 0.55], scale: [1, 3, 1] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeOut",
            delay: enterDelay + 0.3,
          }}
          style={{ transformOrigin: `${point.x}px ${point.y}px` }}
        />
      )}

      {/* The point — glows when active. */}
      <circle
        cx={point.x}
        cy={point.y}
        r={active ? 6 : 4.5}
        fill={active ? "var(--color-accent-primaryHover)" : "var(--color-accent-primary)"}
        filter={active ? "url(#rs-map-hotglow)" : undefined}
        style={{ transition: "r 0.2s ease" }}
      />

      {/* Invisible larger hit target. */}
      <circle cx={point.x} cy={point.y} r={18} fill="transparent" />

      {active && <Callout plotted={plotted} reduced={reduced} onOpenModal={onOpenModal} />}
    </motion.g>
  );
}

// ───────────────────────────────────────────────────────────────────
// Callout — connector line + intel card, shown when a point is active.
// ───────────────────────────────────────────────────────────────────

function Callout({
  plotted,
  reduced,
  onOpenModal,
}: {
  plotted: PlottedCatalyst;
  reduced: boolean;
  onOpenModal: () => void;
}) {
  const { point, catalyst } = plotted;
  const right = point.side === "right";
  const connectorEndX = right ? point.x + CALLOUT_CONNECTOR : point.x - CALLOUT_CONNECTOR;
  const cardX = right ? connectorEndX : connectorEndX - CALLOUT_W;
  const cardY = point.y - CALLOUT_H / 2;
  const textX = cardX + 15;

  // Clicking the callout opens the detail modal. stopPropagation keeps the
  // click from bubbling to the point's toggle handler.
  return (
    // biome-ignore lint/a11y/useSemanticElements: this is an SVG <g>, not HTML — it cannot be a <button>; role="button" + tabIndex + onKeyDown is the correct keyboard-accessible pattern for an interactive SVG group.
    <g
      role="button"
      tabIndex={0}
      aria-label={`Open detail — ${catalyst.event.headline}`}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpenModal();
        }
      }}
    >
      <motion.line
        x1={point.x}
        y1={point.y}
        x2={connectorEndX}
        y2={point.y}
        stroke="var(--color-accent-primary)"
        strokeWidth={1.2}
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
      <circle cx={connectorEndX} cy={point.y} r={2.5} fill="var(--color-accent-primary)" />

      <motion.g
        initial={reduced ? false : { opacity: 0, x: right ? -8 : 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: 0.16, ease: "easeOut" }}
      >
        <rect
          x={cardX}
          y={cardY}
          width={CALLOUT_W}
          height={CALLOUT_H}
          fill="var(--color-surface-raised)"
          stroke="var(--color-accent-primary)"
          strokeWidth={1}
        />
        <rect x={cardX} y={cardY} width={3} height={CALLOUT_H} fill="var(--color-accent-primary)" />
        <text
          x={textX}
          y={cardY + 22}
          style={{
            fontSize: 9.5,
            fill: "var(--color-text-accent)",
            letterSpacing: "0.16em",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
          }}
        >
          {catalyst.event.location?.region ?? "United States"}
        </text>
        <text
          x={textX}
          y={cardY + 44}
          style={{
            fontSize: 16,
            fontWeight: 600,
            fill: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {catalyst.scale}
        </text>
        <text
          x={textX}
          y={cardY + 62}
          style={{
            fontSize: 10.5,
            fill: "var(--color-text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {catalyst.subject}
        </text>
      </motion.g>
    </g>
  );
}

// ───────────────────────────────────────────────────────────────────
// Search pill — the ⌘K affordance into phase 2.
// ───────────────────────────────────────────────────────────────────

function SearchPill({
  reduced,
  onClick,
}: {
  reduced: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="relative z-10 flex justify-center pb-8 sm:pb-10"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reduced ? 0 : 1.9 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group flex items-center gap-3 border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] px-4 py-2.5 transition-colors hover:border-[color:var(--color-accent-primary)]"
      >
        <span className="flex items-center gap-1">
          <kbd className="border border-[color:var(--color-border-default)] px-1.5 py-0.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs leading-none">
            ⌘
          </kbd>
          <kbd className="border border-[color:var(--color-border-default)] px-1.5 py-0.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs leading-none">
            K
          </kbd>
        </span>
        <span className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase transition-colors group-hover:text-[color:var(--color-text-primary)]">
          Run the partner thesis
        </span>
      </button>
    </motion.div>
  );
}
