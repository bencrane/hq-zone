/**
 * OutroGate — the closing beat of the catalyst map demo.
 *
 * A stylized blur rolls over the deep-dive data and locks it behind a single
 * call to action: open the full origination pipeline. The blur does not
 * unmount the data underneath — the data stays visible-but-blurred, the
 * point being "here is the catalyst, fully scored; the rest of the pipeline
 * is built."
 *
 * Adapted from the EquipmentWork demo's `OutroGate`, inverted to the
 * catalyst-partner model and restyled on the `@rare-structure-hq` design
 * system.
 *
 * Reduced motion: the gate fades in with no rolling blur sweep; the CTA is
 * identical and fully usable.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { CAPITAL_PARTNER } from "../data";

export function OutroGate({
  open,
  reduced: reducedProp,
}: {
  open: boolean;
  /** DemoApp already resolved reduced-motion; honour it if passed. */
  reduced?: boolean;
}) {
  const reducedHook = !!useReducedMotion();
  const reduced = reducedProp ?? reducedHook;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.4 }}
        >
          {/* The blur sheet — rolls down over the data on full motion. */}
          <motion.div
            className="absolute inset-0 bg-[color:var(--color-surface-overlay)]"
            style={{
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            initial={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Accent edge that rides the blur front down the screen. */}
          {!reduced && (
            <motion.div
              className="absolute inset-x-0 h-px bg-[color:var(--color-accent-primary)]"
              style={{ boxShadow: "0 0 16px 2px var(--color-accent-primary)" }}
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            />
          )}

          {/* The claim card. */}
          <motion.div
            className="relative w-full max-w-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] px-8 py-10 text-center"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.45,
              delay: reduced ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <div className="mb-5 flex justify-center">
              <span className="flex size-11 items-center justify-center border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)]">
                <Lock className="size-4 text-[color:var(--color-text-accent)]" />
              </span>
            </div>

            <div className="mb-3 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
              The pipeline is built
            </div>

            <h2 className="font-display font-semibold text-[color:var(--color-text-primary)] text-display-md uppercase leading-tight tracking-tight">
              Open the
              <br />
              <span className="text-[color:var(--color-text-accent)]">origination pipeline</span>
            </h2>

            <p className="mt-4 text-[color:var(--color-text-muted)] text-body-sm leading-relaxed">
              Every catalyst scored against {CAPITAL_PARTNER.name}'s thesis, ranked and routed —
              already assembled. The weekly catalyst batch starts here.
            </p>

            <button
              type="button"
              className="group mt-6 inline-flex w-full items-center justify-center gap-2 bg-[color:var(--color-accent-primary)] px-6 py-4 font-display font-semibold text-[color:var(--color-text-onAccent)] text-body-sm uppercase tracking-wider transition-colors hover:bg-[color:var(--color-accent-primaryHover)]"
            >
              Open the pipeline
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <div className="mt-3 font-mono text-[color:var(--color-text-muted)] text-mono-xs lowercase">
              rare-structure · catalyst origination
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
