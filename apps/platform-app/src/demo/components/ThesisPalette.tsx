/**
 * ThesisPalette — the ⌘K palette: the seam from the map into the filter
 * cascade. Adapted from the EquipmentWork demo's `CommandK`, inverted: there
 * it resolved a contractor domain; here it loads the capital partner's thesis
 * and runs the firehose down against it.
 *
 * A polished modal: a single "run thesis" affordance, closes on Esc / backdrop.
 * `onRun` hands control to `DemoApp`, which advances to the filter phase.
 *
 * Styled entirely on the `@rare-structure-hq` design system.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Crosshair, Search } from "lucide-react";
import { useEffect } from "react";
import { CAPITAL_PARTNER } from "../data";

export function ThesisPalette({
  open,
  onClose,
  onRun,
}: {
  open: boolean;
  onClose: () => void;
  onRun: () => void;
}) {
  const reduced = !!useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label="Close thesis palette"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[color:var(--color-surface-overlay)] backdrop-blur-sm"
          />

          {/* biome-ignore lint/a11y/useSemanticElements: native <dialog> needs imperative showModal()/close(), which conflicts with framer-motion AnimatePresence; role="dialog" + aria-modal is correct for an animated modal. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Run partner thesis"
            className="relative w-full max-w-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] shadow-2xl shadow-black/60"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reduced ? { duration: 0.12 } : { duration: 0.2 }}
          >
            {/* Search row */}
            <div className="flex items-center gap-3 border-[color:var(--color-border-subtle)] border-b px-5 py-4">
              <Search className="size-4 shrink-0 text-[color:var(--color-text-muted)]" />
              <span className="flex-1 font-mono text-[color:var(--color-text-default)] text-body-sm">
                Load thesis · {CAPITAL_PARTNER.name}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border border-[color:var(--color-border-default)] px-1.5 py-0.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs leading-none">
                  esc
                </kbd>
              </span>
            </div>

            {/* The thesis line being run */}
            <div className="px-5 py-5">
              <div className="mb-2 flex items-center gap-2 font-mono text-[color:var(--color-text-accent)] text-mono-xs uppercase">
                <Crosshair className="size-3.5" />
                Origination thesis
              </div>
              <p className="text-[color:var(--color-text-default)] text-body-sm leading-relaxed">
                {CAPITAL_PARTNER.thesisLine}
              </p>

              <button
                type="button"
                onClick={onRun}
                className="group mt-5 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--color-accent-primary)] px-5 py-3.5 font-display font-semibold text-[color:var(--color-text-onAccent)] text-body-sm uppercase tracking-wider transition-colors hover:bg-[color:var(--color-accent-primaryHover)]"
              >
                Run thesis against the catalyst firehose
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
