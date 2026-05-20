/**
 * Shared utilities for primitive components.
 *
 * The token-prop mapping tables here are the **single point of contact** between
 * the design-token names (`packages/tokens/src/tokens.ts`) and the Tailwind
 * utility classes Tailwind v4 generates from the `@theme` block in
 * `@rare-structure-hq/tokens/css`.
 *
 * Primitives accept token NAMES as props (`gap="4"`, `color="accent"`) and this
 * module maps each to a class. Primitives never accept arbitrary numbers or hex.
 * If you add a token, add its mapping here.
 */

import type { SpacingToken, color, fontSize as fontSizeTokens } from "@rare-structure-hq/tokens";
import { type ClassValue, clsx } from "clsx";

/** Class-name composer. Thin wrapper over clsx for a stable internal name. */
export function cx(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ───────────── spacing ─────────────
// The prop type is derived from the token source so it cannot drift.

export type SpacingProp = SpacingToken;

/** The spacing scale, mirrored from the token source for table generation. */
const SPACING_KEYS: SpacingProp[] = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
];

function spacingTable(prefix: string): Record<SpacingProp, string> {
  return Object.fromEntries(SPACING_KEYS.map((k) => [k, `${prefix}-${k}`])) as Record<
    SpacingProp,
    string
  >;
}

export const space = {
  gap: spacingTable("gap"),
  p: spacingTable("p"),
  px: spacingTable("px"),
  py: spacingTable("py"),
  mt: spacingTable("mt"),
  mb: spacingTable("mb"),
};

// ───────────── text color ─────────────

export type TextColorProp = keyof typeof color.text;

export const textColor: Record<TextColorProp, string> = {
  primary: "text-[color:var(--color-text-primary)]",
  strong: "text-[color:var(--color-text-strong)]",
  default: "text-[color:var(--color-text-default)]",
  muted: "text-[color:var(--color-text-muted)]",
  subtle: "text-[color:var(--color-text-subtle)]",
  accent: "text-[color:var(--color-text-accent)]",
  onAccent: "text-[color:var(--color-text-onAccent)]",
};

// ───────────── surface bg ─────────────

export type SurfaceProp = keyof typeof color.surface;

export const surfaceBg: Record<SurfaceProp, string> = {
  base: "bg-[color:var(--color-surface-base)]",
  raised: "bg-[color:var(--color-surface-raised)]",
  sunken: "bg-[color:var(--color-surface-sunken)]",
  overlay: "bg-[color:var(--color-surface-overlay)]",
  "raised-translucent": "bg-[color:var(--color-surface-raised-translucent)]",
};

// ───────────── border ─────────────

export type BorderProp = keyof typeof color.border;

export const borderColor: Record<BorderProp, string> = {
  subtle: "border-[color:var(--color-border-subtle)]",
  default: "border-[color:var(--color-border-default)]",
  strong: "border-[color:var(--color-border-strong)]",
  accent: "border-[color:var(--color-border-accent)]",
};

// ───────────── font size ─────────────

export type FontSizeProp = keyof typeof fontSizeTokens;

export const fontSize: Record<FontSizeProp, string> = {
  "body-xs": "text-body-xs",
  "body-sm": "text-body-sm",
  "body-md": "text-body-md",
  "body-lg": "text-body-lg",
  "display-xs": "text-display-xs",
  "display-sm": "text-display-sm",
  "display-md": "text-display-md",
  "display-lg": "text-display-lg",
  "display-xl": "text-display-xl",
  "display-2xl": "text-display-2xl",
  "mono-xs": "text-mono-xs",
  "mono-sm": "text-mono-sm",
  "mono-md": "text-mono-md",
};

// ───────────── page width ─────────────

export type PageVariantProp = "narrow" | "default" | "wide" | "full";

/**
 * Page width — explicit values rather than arbitrary Tailwind utilities. The
 * route layer must not re-introduce raw geometry; <Page> owns it via this table.
 */
export const pageMaxWidth: Record<PageVariantProp, string> = {
  narrow: "max-w-[48rem]",
  default: "max-w-[72rem]",
  wide: "max-w-[84rem]",
  full: "max-w-none",
};
