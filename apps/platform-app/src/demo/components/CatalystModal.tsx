/**
 * CatalystModal — opens when a plotted catalyst's callout on the map is
 * clicked. A centered modal showing that catalyst's full structural detail:
 * the signal, the deal scale, the schema facts, and why it fits the partner's
 * thesis.
 *
 * Adapted from the EquipmentWork demo's `OpportunityModal`, inverted to the
 * catalyst model and restyled entirely on the `@rare-structure-hq` design
 * system — token CSS variables in SVG/markup, no EquipmentWork tokens.
 *
 * Dismissed by the close button, a backdrop click, or Esc. Reduced motion:
 * the modal still opens/closes, just without the spring.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, CalendarClock, Crosshair, Gauge, MapPin, Tag, X } from "lucide-react";
import { type CSSProperties, useEffect } from "react";
import type { DemoCatalyst } from "../data";
import { fmtDate, kindLabel } from "../format";

export function CatalystModal({
  catalyst,
  onClose,
}: {
  catalyst: DemoCatalyst | null;
  onClose: () => void;
}) {
  const reduced = !!useReducedMotion();

  // Esc closes the modal whenever one is open.
  useEffect(() => {
    if (!catalyst) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [catalyst, onClose]);

  return (
    <AnimatePresence>
      {catalyst && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop — click anywhere off the card to dismiss. */}
          <button
            type="button"
            aria-label="Close catalyst detail"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[color:var(--color-surface-overlay)] backdrop-blur-sm"
          />
          <ModalCard catalyst={catalyst} reduced={reduced} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalCard({
  catalyst,
  reduced,
  onClose,
}: {
  catalyst: DemoCatalyst;
  reduced: boolean;
  onClose: () => void;
}) {
  const { event } = catalyst;

  return (
    // biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal()/close(), which conflicts with framer-motion AnimatePresence; role="dialog" + aria-modal is correct for an animated modal.
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Catalyst detail"
      className="relative w-full max-w-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] shadow-2xl shadow-black/60"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
      transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 32 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-[color:var(--color-border-subtle)] border-b px-6 py-4">
        <div className="flex items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
          <Crosshair className="size-3.5" />
          {kindLabel(event.kind)} catalyst · {event.severity}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text-primary)]"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        <h2 className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-sm uppercase leading-tight tracking-tight">
          {event.headline}
        </h2>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display font-semibold text-[color:var(--color-text-accent)] text-display-sm leading-none">
            {catalyst.scale}
          </span>
          <span className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            {catalyst.subject}
          </span>
        </div>

        {event.summary && (
          <p className="mt-4 text-[color:var(--color-text-muted)] text-body-sm leading-relaxed">
            {event.summary}
          </p>
        )}

        {/* Schema facts — a six-cell grid drawn straight from the
            CatalystEvent record. */}
        <div className="mt-5 grid grid-cols-2 gap-px border border-[color:var(--color-border-subtle)] bg-[color:var(--color-border-subtle)]">
          <Fact icon={Tag} label="Kind" value={kindLabel(event.kind)} />
          <Fact icon={Gauge} label="Severity" value={event.severity} />
          <Fact icon={MapPin} label="Region" value={event.location?.region ?? "—"} />
          <Fact icon={Building2} label="Pipeline status" value={event.status} />
          <Fact icon={CalendarClock} label="Observed" value={fmtDate(event.occurred_at)} />
          <Fact icon={CalendarClock} label="Ingested" value={fmtDate(event.ingested_at)} />
        </div>

        {/* Thesis-fit reasoning. */}
        <div className="mt-5">
          <div className="mb-2.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
            Why it fits the thesis
          </div>
          <ul className="flex flex-col gap-2">
            {catalyst.thesisReasons.map((r) => (
              <li key={r.label} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 bg-[color:var(--color-accent-primary)]"
                />
                <span className="text-[color:var(--color-text-default)] text-body-sm leading-snug">
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-[color:var(--color-border-subtle)] border-t px-6 py-3 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
        <Building2 className="size-3" />
        {event.source}
      </div>
    </motion.div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[color:var(--color-surface-raised)] p-3.5">
      <div className="flex items-center gap-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-[color:var(--color-text-primary)] text-body-sm capitalize leading-snug">
        {value}
      </div>
    </div>
  );
}
