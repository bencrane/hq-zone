# rare-structure-hq

Rare Structure HQ monorepo. A catalyst-driven origination firm's platform.

This repository currently holds the **design-system foundation** only. The three
applications (`apps/platform-api`, `apps/platform-app`, `apps/marketing-site`)
and all deploy wiring land in a later cycle.

## Layout

- `packages/tokens` — design tokens (`@rare-structure-hq/tokens`); single source of truth
- `packages/ui` — UI primitives (`@rare-structure-hq/ui`) + Storybook
- `packages/shared` — Zod schemas (`@rare-structure-hq/shared`); the catalyst-event data seam
- `packages/eslint-plugin-rare-structure-hq` — custom ESLint rules (`no-route-geometry`)
- `apps/*` — reserved for the three applications (empty this cycle)

## Design system

Four-layer model: tokens → primitives → shells → routes. `packages/tokens` is the
single source of truth; `build.ts` emits CSS custom properties, a Tailwind theme,
and typed TS exports from one token module. `packages/ui` keeps layout primitives
and visual primitives as distinct sub-layers — routes describe content, primitives
own geometry.

```bash
bun run storybook         # primitive catalog on :6006
bun run storybook:build   # static build
```

## Quickstart (dev)

```bash
bun install
bun run typecheck   # tsc --noEmit over all four packages
bun run build       # builds @rare-structure-hq/tokens then @rare-structure-hq/ui
bun run lint        # biome check over the four packages + root config
bun run test        # package test suites
```

## Workspaces

Bun reads the `workspaces` array in `package.json` natively — there is no
`pnpm-workspace.yaml`. The toolchain floor is Bun >= 1.3 / Node >= 22.
