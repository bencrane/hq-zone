/**
 * State model for the Campaign Configurator & Demo.
 *
 * The four load-bearing fields the configurator holds (named verbatim per the
 * spec):
 *   - selected_scaffold_id  — which dmaas scaffold (layout template) is active.
 *   - brand_id              — the brand the design is bound to (→ design.brand_id).
 *   - target_entity_data    — the resolved entity from the LanceDB/Polaris lake
 *                             whose attributes fill the mailpiece content.
 *   - resolved_positions    — the backend-solved element rects for the ACTIVE
 *                             view. The canvas renders these; no solving here.
 *
 * Constraint solving is the backend's job (dmaas preview / design-create). This
 * module only orchestrates calls and caches the solved surface per canvas view
 * so the Mailer ⇄ Landing Page toggle is instant and lossless.
 */
import { useCallback, useMemo, useReducer } from "react";

import {
  type CompatibleSpec,
  DmaasError,
  type Rect,
  type ResolvedPositions,
  type Scaffold,
  createDesign as apiCreateDesign,
  listScaffolds as apiListScaffolds,
  previewScaffold as apiPreview,
} from "./dmaas";

/** The two canvas renditions the operator toggles between on a call. */
export type CanvasView = "mailer" | "landing";

/** A resolved entity pulled from the lake (gtm.people, a resolved company,
 *  a property, …). Shape is intentionally open — it's merge data, and the
 *  scaffold's prop_schema decides which keys matter. */
export interface TargetEntityData {
  entity_id?: string;
  entity_type?: "company" | "person" | "property" | "other";
  display_name?: string;
  [key: string]: unknown;
}

/** One solved canvas surface — everything the renderer needs for a view. */
export interface SolvedSurface {
  resolved_positions: ResolvedPositions;
  /** Explicit mailpiece/page boundary (from preview). null → derive from the
   *  bounding box of the positions (the design-create response omits it). */
  canvas: Rect | null;
  /** Named solver regions, rendered as faint guides. */
  zones: Record<string, Rect>;
  /** Set once the surface is committed via design-create; null for a preview. */
  design_id: string | null;
}

export type DemoStatus = "idle" | "loading" | "solving" | "ready" | "error";

export interface CampaignDemoState {
  // ── the four spec-named fields ──────────────────────────────────────────
  selected_scaffold_id: string | null;
  brand_id: string | null;
  target_entity_data: TargetEntityData | null;
  resolved_positions: ResolvedPositions | null;

  // ── canvas view + per-view solved surfaces ──────────────────────────────
  view: CanvasView;
  surfaces: Record<CanvasView, SolvedSurface | null>;

  // ── design-create inputs ────────────────────────────────────────────────
  /** (category, variant) from the scaffold's compatible_specs — required by
   *  both preview and design-create. */
  spec: CompatibleSpec | null;
  /** Content props keyed by element name; validated server-side against the
   *  scaffold's prop_schema. Seeded from target_entity_data, operator-editable. */
  content_config: Record<string, unknown>;

  // ── catalog + status ────────────────────────────────────────────────────
  scaffolds: Scaffold[];
  status: DemoStatus;
  error: string | null;
  /** Solver conflicts from the last failed solve, surfaced on the canvas. */
  conflicts: { phase: string; constraint_type: string; message: string }[];
}

export const INITIAL_STATE: CampaignDemoState = {
  selected_scaffold_id: null,
  brand_id: null,
  target_entity_data: null,
  resolved_positions: null,
  view: "mailer",
  surfaces: { mailer: null, landing: null },
  spec: null,
  content_config: {},
  scaffolds: [],
  status: "idle",
  error: null,
  conflicts: [],
};

type Action =
  | { type: "SCAFFOLDS_LOADING" }
  | { type: "SCAFFOLDS_LOADED"; scaffolds: Scaffold[] }
  | { type: "SELECT_SCAFFOLD"; scaffold: Scaffold }
  | { type: "SET_BRAND"; brand_id: string | null }
  | { type: "SET_TARGET_ENTITY"; entity: TargetEntityData | null }
  | { type: "SET_CONTENT"; content_config: Record<string, unknown> }
  | { type: "SET_SPEC"; spec: CompatibleSpec }
  | { type: "SET_VIEW"; view: CanvasView }
  | { type: "SOLVING" }
  | { type: "SURFACE_SOLVED"; view: CanvasView; surface: SolvedSurface }
  | { type: "ERROR"; error: string; conflicts?: CampaignDemoState["conflicts"] };

/** Keep the active-view mirror fields (`resolved_positions`) in sync with the
 *  surface map. Called whenever `view` or a surface changes. */
function withActiveSurface(state: CampaignDemoState): CampaignDemoState {
  const active = state.surfaces[state.view];
  return { ...state, resolved_positions: active?.resolved_positions ?? null };
}

export function reducer(state: CampaignDemoState, action: Action): CampaignDemoState {
  switch (action.type) {
    case "SCAFFOLDS_LOADING":
      return { ...state, status: "loading", error: null };

    case "SCAFFOLDS_LOADED":
      return {
        ...state,
        scaffolds: action.scaffolds,
        status: state.status === "loading" ? "idle" : state.status,
      };

    case "SELECT_SCAFFOLD": {
      // Default the spec to the scaffold's first compatible (category, variant).
      const spec = action.scaffold.compatible_specs[0] ?? null;
      return {
        ...state,
        selected_scaffold_id: action.scaffold.id,
        spec,
        error: null,
        conflicts: [],
      };
    }

    case "SET_BRAND":
      return { ...state, brand_id: action.brand_id };

    case "SET_TARGET_ENTITY":
      // Seed content from the entity so a first solve has merge data to place.
      return {
        ...state,
        target_entity_data: action.entity,
        content_config: action.entity ? { ...action.entity } : state.content_config,
      };

    case "SET_CONTENT":
      return { ...state, content_config: action.content_config };

    case "SET_SPEC":
      return { ...state, spec: action.spec, error: null, conflicts: [] };

    case "SET_VIEW":
      return withActiveSurface({ ...state, view: action.view });

    case "SOLVING":
      return { ...state, status: "solving", error: null, conflicts: [] };

    case "SURFACE_SOLVED":
      return withActiveSurface({
        ...state,
        status: "ready",
        error: null,
        conflicts: [],
        surfaces: { ...state.surfaces, [action.view]: action.surface },
      });

    case "ERROR":
      return { ...state, status: "error", error: action.error, conflicts: action.conflicts ?? [] };

    default:
      return state;
  }
}

/** Map a DmaasError (or any thrown value) to a UI message + structured
 *  conflicts the canvas can list. */
function describeError(e: unknown): { error: string; conflicts: CampaignDemoState["conflicts"] } {
  if (e instanceof DmaasError) {
    const conflicts = e.conflicts.map((c) => ({
      phase: c.phase,
      constraint_type: c.constraint_type,
      message: c.message,
    }));
    const base =
      e.code === "design_does_not_solve" || e.code === "scaffold_does_not_solve"
        ? "Layout could not be solved for this content."
        : e.code === "content_schema_violation"
          ? `Content doesn't match the scaffold schema: ${e.schemaErrors.join("; ")}`
          : e.message;
    return { error: base, conflicts };
  }
  return { error: e instanceof Error ? e.message : "Unexpected error", conflicts: [] };
}

export interface CampaignDemoActions {
  loadScaffolds: () => Promise<void>;
  selectScaffold: (id: string) => void;
  setBrand: (brand_id: string | null) => void;
  setTargetEntity: (entity: TargetEntityData | null) => void;
  setContent: (content_config: Record<string, unknown>) => void;
  setSpec: (spec: CompatibleSpec) => void;
  setView: (view: CanvasView) => void;
  /** Solve WITHOUT persisting — live iteration. Populates the active view. */
  preview: () => Promise<void>;
  /** Solve + persist a design — the commit step. Populates the active view. */
  generate: () => Promise<void>;
}

/**
 * The configurator's state + orchestration. Owns the reducer and wraps every
 * dmaas call so the UI just calls `actions.preview()` / `actions.generate()`
 * and reads `state.resolved_positions`.
 */
export function useCampaignDemo(): {
  state: CampaignDemoState;
  actions: CampaignDemoActions;
  selectedScaffold: Scaffold | null;
} {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const selectedScaffold = useMemo(
    () => state.scaffolds.find((s) => s.id === state.selected_scaffold_id) ?? null,
    [state.scaffolds, state.selected_scaffold_id],
  );

  const loadScaffolds = useCallback(async () => {
    dispatch({ type: "SCAFFOLDS_LOADING" });
    try {
      const res = await apiListScaffolds();
      dispatch({ type: "SCAFFOLDS_LOADED", scaffolds: res.scaffolds });
    } catch (e) {
      dispatch({ type: "ERROR", ...describeError(e) });
    }
  }, []);

  const selectScaffold = useCallback(
    (id: string) => {
      const scaffold = state.scaffolds.find((s) => s.id === id);
      if (scaffold) dispatch({ type: "SELECT_SCAFFOLD", scaffold });
    },
    [state.scaffolds],
  );

  const setBrand = useCallback(
    (brand_id: string | null) => dispatch({ type: "SET_BRAND", brand_id }),
    [],
  );
  const setTargetEntity = useCallback(
    (entity: TargetEntityData | null) => dispatch({ type: "SET_TARGET_ENTITY", entity }),
    [],
  );
  const setContent = useCallback(
    (content_config: Record<string, unknown>) => dispatch({ type: "SET_CONTENT", content_config }),
    [],
  );
  const setSpec = useCallback((spec: CompatibleSpec) => dispatch({ type: "SET_SPEC", spec }), []);
  const setView = useCallback((view: CanvasView) => dispatch({ type: "SET_VIEW", view }), []);

  const preview = useCallback(async () => {
    if (!selectedScaffold || !state.spec) return;
    const { view } = state;
    dispatch({ type: "SOLVING" });
    try {
      const res = await apiPreview(selectedScaffold.slug, {
        spec_category: state.spec.category,
        spec_variant: state.spec.variant,
        placeholder_content: state.content_config,
      });
      if (!res.is_valid) {
        dispatch({
          type: "ERROR",
          error: "Layout could not be solved for this content.",
          conflicts: res.conflicts.map((c) => ({
            phase: c.phase,
            constraint_type: c.constraint_type,
            message: c.message,
          })),
        });
        return;
      }
      dispatch({
        type: "SURFACE_SOLVED",
        view,
        surface: {
          resolved_positions: res.positions,
          canvas: res.canvas,
          zones: res.zones,
          design_id: null,
        },
      });
    } catch (e) {
      dispatch({ type: "ERROR", ...describeError(e) });
    }
  }, [selectedScaffold, state]);

  const generate = useCallback(async () => {
    if (!selectedScaffold || !state.spec) return;
    const { view } = state;
    dispatch({ type: "SOLVING" });
    try {
      const design = await apiCreateDesign({
        scaffold_id: selectedScaffold.id,
        spec_category: state.spec.category,
        spec_variant: state.spec.variant,
        content_config: state.content_config,
        brand_id: state.brand_id,
      });
      dispatch({
        type: "SURFACE_SOLVED",
        view,
        surface: {
          resolved_positions: design.resolved_positions,
          // design-create returns no canvas/zones — the renderer derives bounds.
          canvas: null,
          zones: {},
          design_id: design.id,
        },
      });
    } catch (e) {
      dispatch({ type: "ERROR", ...describeError(e) });
    }
  }, [selectedScaffold, state]);

  const actions = useMemo<CampaignDemoActions>(
    () => ({
      loadScaffolds,
      selectScaffold,
      setBrand,
      setTargetEntity,
      setContent,
      setSpec,
      setView,
      preview,
      generate,
    }),
    [
      loadScaffolds,
      selectScaffold,
      setBrand,
      setTargetEntity,
      setContent,
      setSpec,
      setView,
      preview,
      generate,
    ],
  );

  return { state, actions, selectedScaffold };
}
