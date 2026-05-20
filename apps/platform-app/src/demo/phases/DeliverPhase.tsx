/**
 * DeliverPhase — Phase 4 of the catalyst map demo: the deep dive.
 *
 * Clicking a catalyst in the match feed blows that one catalyst up to full
 * detail. The signals the routing engine scored on get their own labeled
 * panels — thesis fit, catalyst kind, geography, deal scale — each
 * cross-referenced against the partner's thesis. The "why the engine routed
 * it" panel makes the structural case explicit.
 *
 * After a beat the OutroGate rolls in: a blur over the data leaving a single
 * call to action.
 *
 * Adapted from the EquipmentWork demo's `ExpandPhase`, inverted to the
 * catalyst-partner model and restyled on the `@rare-structure-hq` design
 * system. Detail markup is kept inside `src/demo/**` — nothing is imported
 * from the marketing site.
 *
 * Reduced motion: detail renders settled; the outro gate appears with no
 * blur sweep.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CalendarClock, Crosshair, Gauge, Layers, MapPin, Tag } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { CAPITAL_PARTNER, type DemoCatalyst, MATCHED_CATALYSTS, type ThesisReason } from "../data";
import { fitTier, fmtDate, kindLabel } from "../format";
import { OutroGate } from "./OutroGate";

// Beat before the outro gate rolls over the data.
const OUTRO_DELAY_MS = 2600;

export function DeliverPhase({
  catalystIndex,
  onClose,
}: {
  catalystIndex: number;
  onClose: () => void;
}) {
  const reduced = !!useReducedMotion();
  const [outroOpen, setOutroOpen] = useState(false);
  const catalyst = MATCHED_CATALYSTS[catalystIndex];

  // The outro gate auto-arms after a beat.
  useEffect(() => {
    const t = window.setTimeout(() => setOutroOpen(true), reduced ? 700 : OUTRO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (!catalyst) return null;

  return (
    <motion.div
      className="relative h-screen w-full overflow-hidden bg-[color:var(--color-surface-base)]"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="rs-scanlines pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative h-full overflow-y-auto">
        <DeliverInner catalyst={catalyst} reduced={reduced} onClose={onClose} />
      </div>

      <OutroGate open={outroOpen} reduced={reduced} />
    </motion.div>
  );
}

/**
 * Width wrapper. Geometry lives here, off the phase root, so the route file
 * (which renders <DemoApp/>) authors none.
 */
function DeliverInner({
  catalyst,
  reduced,
  onClose,
}: {
  catalyst: DemoCatalyst;
  reduced: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-7 sm:px-8">
      {/* Back to the feed. */}
      <motion.button
        type="button"
        onClick={onClose}
        className="group mb-6 flex items-center gap-2 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase transition-colors hover:text-[color:var(--color-text-primary)]"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        All matched catalysts
      </motion.button>

      <DeliverDetail catalyst={catalyst} reduced={reduced} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// The expanded catalyst detail.
// ───────────────────────────────────────────────────────────────────

function DeliverDetail({
  catalyst,
  reduced,
}: {
  catalyst: DemoCatalyst;
  reduced: boolean;
}) {
  const { event } = catalyst;

  return (
    <div>
      {/* Headline. */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <FitBadge score={catalyst.thesisFit} />
          <span className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            {kindLabel(event.kind)}
          </span>
          <span className="font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
            {event.severity}
          </span>
          <span className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            {event.status}
          </span>
        </div>

        <h1 className="max-w-3xl font-display font-semibold text-[color:var(--color-text-primary)] text-display-lg uppercase leading-tight tracking-tight">
          {event.headline}
        </h1>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          <span>{catalyst.subject}</span>
          <span aria-hidden="true">·</span>
          <span>{catalyst.scale}</span>
        </div>
      </motion.div>

      {/* ── The four scored signals ──────────────────────────────────── */}
      <motion.div
        className="mt-7 grid grid-cols-1 gap-px border border-[color:var(--color-border-subtle)] bg-[color:var(--color-border-subtle)] sm:grid-cols-2"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: reduced ? 0 : 0.12 }}
      >
        <SignalPanel
          icon={Layers}
          label="Thesis fit"
          headline={`${catalyst.thesisFit}%`}
          body={
            fitTier(catalyst.thesisFit) === "high"
              ? "Strong structural fit — top of this week's matched set."
              : fitTier(catalyst.thesisFit) === "mid"
                ? "Solid fit — worth a serious look."
                : "Lighter fit — an early structural signal."
          }
        >
          <FitBar score={catalyst.thesisFit} reduced={reduced} />
        </SignalPanel>

        <SignalPanel
          icon={Tag}
          label="Catalyst kind"
          headline={kindLabel(event.kind)}
          body={
            CAPITAL_PARTNER.catalystKinds.includes(event.kind)
              ? `${kindLabel(event.kind)} — a catalyst kind the thesis is tuned to.`
              : `${kindLabel(event.kind)} — adjacent to the tuned kinds.`
          }
        >
          <SignalTag
            on={CAPITAL_PARTNER.catalystKinds.includes(event.kind)}
            text={
              CAPITAL_PARTNER.catalystKinds.includes(event.kind)
                ? "Tuned catalyst kind"
                : "Adjacent kind"
            }
          />
        </SignalPanel>

        <SignalPanel
          icon={MapPin}
          label="Geography"
          headline={event.location?.region ?? "Not located"}
          body="Place of the structural signal, against the thesis coverage map."
        >
          <SignalTag on text="Within coverage" />
        </SignalPanel>

        <SignalPanel
          icon={Gauge}
          label="Deal scale"
          headline={catalyst.scale}
          body={`Against ${CAPITAL_PARTNER.checkSize} — sized for this thesis.`}
        >
          <SignalTag on text={CAPITAL_PARTNER.checkSize} />
        </SignalPanel>
      </motion.div>

      {/* ── Signal facts + why-it-matched ────────────────────────────── */}
      <motion.div
        className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: reduced ? 0 : 0.2 }}
      >
        {/* Signal facts — straight from the CatalystEvent record. */}
        <div className="border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5">
          <div className="mb-3.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Catalyst signal
          </div>
          <dl className="flex flex-col gap-3">
            <FactRow icon={CalendarClock} label="Observed" value={fmtDate(event.occurred_at)} />
            <FactRow icon={CalendarClock} label="Ingested" value={fmtDate(event.ingested_at)} />
            <FactRow icon={Crosshair} label="Source" value={event.source} />
            <FactRow
              icon={Gauge}
              label="Confidence"
              value={
                event.confidence === null
                  ? "Not yet scored"
                  : `${Math.round(event.confidence * 100)}%`
              }
            />
          </dl>
        </div>

        {/* Why it matched. */}
        <div className="border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5">
          <div className="mb-3.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Why the engine routed it
          </div>
          <ul className="flex flex-col gap-2.5">
            {catalyst.thesisReasons.map((r) => (
              <li key={r.label} className="flex items-start gap-2.5">
                <ReasonGlyph kind={r.kind} />
                <span className="text-[color:var(--color-text-default)] text-body-sm leading-snug">
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Pieces.
// ───────────────────────────────────────────────────────────────────

function SignalPanel({
  icon: Icon,
  label,
  headline,
  body,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  headline: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[color:var(--color-surface-base)] p-5">
      <div className="mb-2.5 flex items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-sm leading-none tracking-tight">
        {headline}
      </div>
      <p className="mt-2 text-[color:var(--color-text-muted)] text-body-sm leading-snug">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FitBadge({ score }: { score: number }) {
  const tier = fitTier(score);
  const cls =
    tier === "high"
      ? "bg-[color:var(--color-accent-primary)] text-[color:var(--color-text-onAccent)]"
      : tier === "mid"
        ? "border border-[color:var(--color-accent-primary)] text-[color:var(--color-text-accent)]"
        : "border border-[color:var(--color-border-default)] text-[color:var(--color-text-muted)]";
  return (
    <span className={`px-2 py-1 font-mono text-mono-xs uppercase tabular-nums ${cls}`}>
      {score}% thesis fit
    </span>
  );
}

function FitBar({ score, reduced }: { score: number; reduced: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden bg-[color:var(--color-surface-sunken)]">
      <motion.div
        className="h-full bg-[color:var(--color-accent-primary)]"
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.3 }}
      />
    </div>
  );
}

function SignalTag({ on, text }: { on: boolean; text: string }) {
  const cls = on
    ? "border-[color:var(--color-accent-primary)] text-[color:var(--color-text-accent)]"
    : "border-[color:var(--color-border-default)] text-[color:var(--color-text-muted)]";
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 font-mono text-mono-xs uppercase ${cls}`}
    >
      {text}
    </span>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-[color:var(--color-text-muted)]" />
      <div className="min-w-0">
        <div className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          {label}
        </div>
        <div className="mt-0.5 text-[color:var(--color-text-primary)] text-body-sm">{value}</div>
      </div>
    </div>
  );
}

function ReasonGlyph({ kind }: { kind: ThesisReason["kind"] }) {
  const cls = "size-3.5 mt-0.5 shrink-0 text-[color:var(--color-text-accent)]";
  switch (kind) {
    case "sector":
      return <Tag className={cls} />;
    case "geo":
      return <MapPin className={cls} />;
    case "catalyst-kind":
      return <Crosshair className={cls} />;
    case "scale":
      return <Gauge className={cls} />;
    case "timing":
      return <CalendarClock className={cls} />;
    default:
      return <Layers className={cls} />;
  }
}
