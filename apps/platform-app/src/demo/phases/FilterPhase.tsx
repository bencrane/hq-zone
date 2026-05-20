/**
 * FilterPhase — Phase 2 of the catalyst map demo: the cascade.
 *
 * Fires when the partner runs their thesis in the ⌘K palette. Plays a staged
 * resolution scan — load the thesis, filter the catalyst firehose, score
 * structural fit, rank the matched set — each step ticking pending → running
 * → done — then hands off to the Match phase (phase 3).
 *
 * Adapted from the EquipmentWork demo's `ResolutionPhase`, inverted to the
 * thesis-cascade model and restyled on the `@rare-structure-hq` design
 * system.
 *
 * Reduced motion: no scan choreography — render every step done and hand off
 * on the next frame.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ACTIVE_CATALYST_COUNT, SCAN_STEPS, SCAN_STEP_MS } from "../data";

const SETTLE_MS = 360; // beat after the last step before handoff

export function FilterPhase({ onComplete }: { onComplete: () => void }) {
  const reduced = !!useReducedMotion();
  // `current` = index of the step in progress. >= length means all done.
  const [current, setCurrent] = useState(reduced ? SCAN_STEPS.length : 0);

  // Reduced motion: skip the staged scan, hand off immediately.
  useEffect(() => {
    if (!reduced) return;
    const t = window.setTimeout(onComplete, 30);
    return () => window.clearTimeout(t);
  }, [reduced, onComplete]);

  // Full-motion: advance one step per SCAN_STEP_MS, then settle + hand off.
  useEffect(() => {
    if (reduced) return;
    if (current >= SCAN_STEPS.length) {
      const t = window.setTimeout(onComplete, SETTLE_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setCurrent((c) => c + 1), SCAN_STEP_MS);
    return () => window.clearTimeout(t);
  }, [current, reduced, onComplete]);

  const done = Math.min(current, SCAN_STEPS.length);
  const progress = done / SCAN_STEPS.length;

  return (
    <motion.div
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[color:var(--color-surface-base)] px-6"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 44% at 50% 46%, var(--color-accent-soft), transparent 72%)",
        }}
      />
      <div className="rs-scanlines pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative w-full max-w-xl">
        {/* Sweep line — a single pass behind the panel. */}
        {!reduced && (
          <motion.div
            className="-inset-x-8 pointer-events-none absolute top-0 h-px bg-[color:var(--color-accent-primary)]"
            style={{ boxShadow: "0 0 12px 1px var(--color-accent-primary)" }}
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 0.9, 0] }}
            transition={{
              duration: 1.9,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        )}

        <div className="border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)]">
          {/* Header — the cascade in progress. */}
          <div className="flex items-center justify-between gap-4 border-[color:var(--color-border-subtle)] border-b px-6 py-4">
            <div className="font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
              Thesis resolution
            </div>
            <div className="font-mono text-[color:var(--color-text-accent)] text-mono-sm tabular-nums">
              {Math.round(progress * 100)}%
            </div>
          </div>

          {/* The firehose being filtered. */}
          <div className="px-6 pt-5">
            <div className="mb-1.5 font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
              Catalyst firehose
            </div>
            <div className="font-mono text-[color:var(--color-text-primary)] text-body-md tabular-nums">
              {ACTIVE_CATALYST_COUNT.toLocaleString()} live signals
            </div>
          </div>

          {/* The staged steps. */}
          <ul className="flex flex-col gap-px px-6 py-5">
            {SCAN_STEPS.map((step, i) => {
              const state = i < done ? "done" : i === done ? "running" : "pending";
              return (
                <ScanStepRow
                  key={step.label}
                  index={i}
                  label={step.label}
                  detail={step.detail}
                  state={state}
                  reduced={reduced}
                />
              );
            })}
          </ul>

          {/* Progress meter. */}
          <div className="px-6 pb-6">
            <div className="h-1 overflow-hidden bg-[color:var(--color-surface-sunken)]">
              <motion.div
                className="h-full bg-[color:var(--color-accent-primary)]"
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: reduced ? 0 : 0.32, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
              <span>
                {done < SCAN_STEPS.length
                  ? "Cascading the firehose to the thesis"
                  : "Matched set ready — opening"}
              </span>
              <span className="tabular-nums">
                {done}/{SCAN_STEPS.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────
// A single scan step — pending / running / done.
// ───────────────────────────────────────────────────────────────────

function ScanStepRow({
  index,
  label,
  detail,
  state,
  reduced,
}: {
  index: number;
  label: string;
  detail: string;
  state: "pending" | "running" | "done";
  reduced: boolean;
}) {
  const labelColor =
    state === "running"
      ? "text-[color:var(--color-text-primary)]"
      : state === "done"
        ? "text-[color:var(--color-text-muted)]"
        : "text-[color:var(--color-text-subtle)]";
  const wordColor =
    state === "done"
      ? "text-[color:var(--color-text-accent)]"
      : state === "running"
        ? "text-[color:var(--color-text-muted)]"
        : "text-[color:var(--color-text-subtle)]";

  return (
    <motion.li
      className="flex items-center gap-3 py-2"
      initial={reduced ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: state === "pending" ? 0.5 : 1, x: 0 }}
      transition={{ duration: 0.25, delay: reduced ? 0 : index * 0.05 }}
    >
      {/* Status glyph. */}
      <span className="flex size-4 shrink-0 items-center justify-center">
        {state === "done" && <Check className="size-3.5 text-[color:var(--color-text-accent)]" />}
        {state === "running" &&
          (reduced ? (
            <span className="size-2 bg-[color:var(--color-accent-primary)]" />
          ) : (
            <Loader2 className="size-3.5 animate-spin text-[color:var(--color-text-accent)]" />
          ))}
        {state === "pending" && <span className="size-1.5 bg-[color:var(--color-text-subtle)]" />}
      </span>

      {/* Step label + detail. */}
      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <span className={`font-mono text-mono-sm ${labelColor}`}>{label}</span>
        <span className="truncate font-mono text-[color:var(--color-text-muted)] text-mono-xs uppercase">
          {detail}
        </span>
      </span>

      {/* Trailing status word. */}
      <span className={`w-12 shrink-0 text-right font-mono text-mono-xs uppercase ${wordColor}`}>
        {state === "done" ? "OK" : state === "running" ? "···" : "—"}
      </span>
    </motion.li>
  );
}
