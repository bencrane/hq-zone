// Flat ESLint config — scoped to route files for the `no-route-geometry` rule.
// Biome remains the project's primary linter/formatter; ESLint exists only to
// host custom AST rules biome doesn't support.
//
// The `files` glob points at the future `apps/*` route path. That directory is
// empty this cycle (the three apps are a later cycle) — the glob simply matches
// nothing for now. The `no-route-geometry` rule is exercised by its own unit
// test in `packages/eslint-plugin-rare-structure-hq`.

import tsParser from "@typescript-eslint/parser";
import rareStructurePlugin from "eslint-plugin-rare-structure-hq";

export default [
  {
    files: ["apps/platform-app/src/routes/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "rare-structure-hq": rareStructurePlugin,
    },
    rules: {
      "rare-structure-hq/no-route-geometry": "error",
    },
  },
];
