/**
 * MailpieceCanvas — the Preview Canvas (center pane).
 *
 * A PURE renderer. It takes `resolved_positions` (element name → absolute
 * {x,y,w,h} pixel rect, solved by the backend) and paints each one as an
 * absolutely-positioned element over a scaled background that represents the
 * mailpiece boundary. No constraint solving happens here — the backend owns
 * that; this component only maps already-solved pixels onto the screen.
 *
 * Boundary: use the explicit `canvas` rect when present (dmaas preview returns
 * it); otherwise derive it from the bounding box of the positions (the
 * design-create response omits canvas) with a small margin.
 *
 * `mode` switches the chrome only — the same position-mapping logic drives both:
 *   - "mailer"  → physical paper card, landscape, faint bleed/safe guides.
 *   - "landing" → browser-window chrome with a scrollable web viewport.
 */
import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { Rect, ResolvedPositions } from "./dmaas";
import type { CanvasView, DemoStatus } from "./state";

interface MailpieceCanvasProps {
  positions: ResolvedPositions | null;
  /** Explicit mailpiece/page boundary; null → derived from positions' bbox. */
  canvas: Rect | null;
  zones?: Record<string, Rect>;
  mode: CanvasView;
  /** Element name → content (string, or `{ text }`/object) for labels. */
  content?: Record<string, unknown>;
  selectedElement?: string | null;
  onSelectElement?: (name: string | null) => void;
  status?: DemoStatus;
  conflicts?: { phase: string; constraint_type: string; message: string }[];
}

/** Union bounding box of every rect; a 1×1 fallback keeps math finite. */
function boundsOf(positions: ResolvedPositions): Rect {
  const rects = Object.values(positions);
  if (rects.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/** Track a node's content-box size so the stage scales to fit responsively. */
function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  { w: number; h: number },
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Resolve a display string for an element from its content_config entry. */
function labelFor(name: string, content: Record<string, unknown> | undefined): string {
  const v = content?.[name];
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const t = (v as Record<string, unknown>).text ?? (v as Record<string, unknown>).value;
    if (typeof t === "string") return t;
  }
  return name;
}

/** A muted, stable accent per element name so blocks are distinguishable. */
const ELEMENT_HUES = [201, 24, 142, 280, 48, 0, 320, 170] as const;
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ELEMENT_HUES[h % ELEMENT_HUES.length];
}

export function MailpieceCanvas({
  positions,
  canvas,
  zones,
  mode,
  content,
  selectedElement,
  onSelectElement,
  status,
  conflicts,
}: MailpieceCanvasProps) {
  const [frameRef, frame] = useElementSize<HTMLDivElement>();

  const boundary = useMemo<Rect | null>(() => {
    if (canvas) return canvas;
    if (positions && Object.keys(positions).length > 0) {
      const bb = boundsOf(positions);
      const margin = Math.max(bb.w, bb.h) * 0.06;
      return { x: bb.x - margin, y: bb.y - margin, w: bb.w + margin * 2, h: bb.h + margin * 2 };
    }
    return null;
  }, [canvas, positions]);

  // Fit the boundary into the frame, preserving aspect. Cap upscale so a tiny
  // postcard spec doesn't blow up to a blurry wall of color.
  const scale = useMemo(() => {
    if (!boundary || frame.w === 0 || frame.h === 0) return 0;
    const pad = 32;
    const availW = Math.max(0, frame.w - pad * 2);
    const availH = Math.max(0, frame.h - pad * 2);
    return Math.min(availW / boundary.w, availH / boundary.h, 2);
  }, [boundary, frame]);

  const stage = boundary
    ? { width: boundary.w * scale, height: boundary.h * scale }
    : { width: 0, height: 0 };

  const hasPositions = Boolean(positions && Object.keys(positions).length > 0);
  const isSolving = status === "solving";

  return (
    <Flex
      direction="column"
      height="100%"
      style={{ background: "var(--gray-2)", minWidth: 0, minHeight: 0 }}
    >
      {/* Canvas toolbar — format/mode + element count */}
      <Flex
        align="center"
        justify="between"
        px="4"
        py="2"
        style={{ borderBottom: "1px solid var(--gray-a4)", flexShrink: 0 }}
      >
        <Flex align="center" gap="2">
          <Text size="1" color="gray" weight="medium">
            {mode === "mailer" ? "Mailpiece" : "Landing page"}
          </Text>
          {boundary ? (
            <Text size="1" color="gray">
              · {Math.round(boundary.w)}×{Math.round(boundary.h)}px
            </Text>
          ) : null}
        </Flex>
        {hasPositions ? (
          <Badge variant="soft" color="gray" radius="full" size="1">
            {Object.keys(positions ?? {}).length} elements
            {scale > 0 ? ` · ${Math.round(scale * 100)}%` : ""}
          </Badge>
        ) : null}
      </Flex>

      {/* Stage frame — measured; the scaled boundary is centered inside */}
      <Box
        ref={frameRef}
        style={{ position: "relative", flexGrow: 1, minHeight: 0, overflow: "auto" }}
      >
        <Flex
          align="center"
          justify="center"
          style={{ position: "absolute", inset: 0, padding: 32 }}
        >
          {!hasPositions ? (
            <EmptyOrError status={status} conflicts={conflicts} />
          ) : (
            <Box
              style={{
                position: "relative",
                width: stage.width,
                height: stage.height,
                opacity: isSolving ? 0.5 : 1,
                transition: "opacity 120ms ease",
                ...chromeStyle(mode),
              }}
            >
              {/* Zone guides (behind elements) */}
              {zones &&
                boundary &&
                Object.entries(zones).map(([zname, z]) => (
                  <div
                    key={`zone:${zname}`}
                    title={`zone: ${zname}`}
                    style={{
                      position: "absolute",
                      left: (z.x - boundary.x) * scale,
                      top: (z.y - boundary.y) * scale,
                      width: z.w * scale,
                      height: z.h * scale,
                      border: "1px dashed var(--gray-a6)",
                      borderRadius: 2,
                      pointerEvents: "none",
                    }}
                  />
                ))}

              {/* Resolved elements */}
              {boundary &&
                positions &&
                Object.entries(positions).map(([name, r]) => {
                  const selected = name === selectedElement;
                  const hue = hueFor(name);
                  return (
                    <button
                      type="button"
                      key={name}
                      onClick={() => onSelectElement?.(selected ? null : name)}
                      title={`${name} · ${Math.round(r.w)}×${Math.round(r.h)} @ (${Math.round(r.x)}, ${Math.round(r.y)})`}
                      style={{
                        position: "absolute",
                        left: (r.x - boundary.x) * scale,
                        top: (r.y - boundary.y) * scale,
                        width: r.w * scale,
                        height: r.h * scale,
                        background: `hsl(${hue} 70% 55% / 0.14)`,
                        border: selected
                          ? "1.5px solid var(--accent-9)"
                          : `1px solid hsl(${hue} 60% 55% / 0.5)`,
                        borderRadius: 3,
                        padding: 4,
                        overflow: "hidden",
                        textAlign: "left",
                        cursor: "pointer",
                        boxShadow: selected ? "0 0 0 3px var(--accent-a5)" : "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: Math.max(8, Math.min(13, r.h * scale * 0.28)),
                          lineHeight: 1.2,
                          color: "var(--gray-12)",
                          fontWeight: 500,
                          wordBreak: "break-word",
                        }}
                      >
                        {labelFor(name, content)}
                      </span>
                      <span
                        style={{
                          marginTop: 2,
                          fontSize: 9,
                          color: "var(--gray-a9)",
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {name}
                      </span>
                    </button>
                  );
                })}
            </Box>
          )}
        </Flex>
      </Box>
    </Flex>
  );
}

/** Per-mode background chrome for the scaled stage. */
function chromeStyle(mode: CanvasView): React.CSSProperties {
  if (mode === "landing") {
    return {
      background: "#ffffff",
      borderRadius: 6,
      boxShadow: "0 12px 40px -12px rgba(0,0,0,0.55)",
      outline: "1px solid var(--gray-a5)",
    };
  }
  // mailer: physical paper card.
  return {
    background: "#fcfcfa",
    borderRadius: 4,
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.6)",
    outline: "1px solid var(--gray-a5)",
  };
}

function EmptyOrError({
  status,
  conflicts,
}: {
  status?: DemoStatus;
  conflicts?: { phase: string; constraint_type: string; message: string }[];
}) {
  const hasConflicts = conflicts && conflicts.length > 0;
  return (
    <Flex direction="column" align="center" justify="center" gap="3" style={{ maxWidth: 460 }}>
      <Box
        style={{
          width: 168,
          height: 108,
          borderRadius: 6,
          border: "1.5px dashed var(--gray-a6)",
          background: "var(--gray-a2)",
        }}
      />
      {status === "error" ? (
        <Flex direction="column" align="center" gap="2">
          <Text size="2" color="tomato" weight="medium">
            Layout didn't solve
          </Text>
          {hasConflicts ? (
            <Flex direction="column" gap="1" style={{ textAlign: "center" }}>
              {conflicts.slice(0, 4).map((c, i) => (
                <Text key={`${c.constraint_type}:${i}`} size="1" color="gray">
                  <Text color="tomato">{c.phase}</Text> · {c.constraint_type}: {c.message}
                </Text>
              ))}
            </Flex>
          ) : (
            <Text size="1" color="gray">
              Adjust the content or pick a different spec, then re-solve.
            </Text>
          )}
        </Flex>
      ) : status === "solving" ? (
        <Text size="2" color="gray">
          Solving layout…
        </Text>
      ) : (
        <Text size="2" color="gray">
          Pick a scaffold and generate a design — the solved layout renders here.
        </Text>
      )}
    </Flex>
  );
}
