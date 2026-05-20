/**
 * @rare-structure-hq/ui — UI primitives.
 *
 * Two distinct sub-layers:
 *   - Layout primitives (`layout.tsx`) own geometry: Stack, Inline, Grid, Box,
 *     Divider, Page.
 *   - Visual primitives (`visual.tsx`) own surface/type/color: Text, Card,
 *     Badge, Button.
 *
 * Source-exported — there is no compiled build; consumers import `./src`
 * directly. `build` runs `tsc --noEmit` as a typecheck.
 */

// ── Layout sub-layer ──
export {
  Stack,
  Inline,
  Grid,
  Box,
  Divider,
  Page,
  type StackProps,
  type InlineProps,
  type GridProps,
  type BoxProps,
  type DividerProps,
  type PageProps,
} from "./layout";

// ── Visual sub-layer ──
export {
  Text,
  Card,
  Badge,
  Button,
  type TextProps,
  type CardProps,
  type BadgeProps,
  type BadgeTone,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./visual";

// ── Token-prop utilities ──
export {
  cx,
  type SpacingProp,
  type TextColorProp,
  type SurfaceProp,
  type BorderProp,
  type FontSizeProp,
  type PageVariantProp,
} from "./utils";
