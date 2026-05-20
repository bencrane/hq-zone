# platform-app — Vite + React SPA. Railway builds this from the repo root:
# `docker build -f apps/platform-app/Dockerfile <repo-root>`.
# Classic Dockerfile — no BuildKit-only features (Railway's builder rejects
# `RUN --mount`); the uncached install is fine.

# ── build: install the workspace, build tokens, then build the Vite app ──────
# Bun reads the root package.json (workspaces: apps/*, packages/*); the whole
# repo is copied first so every member's package.json is present, then one
# install pass. @rare-structure-hq/tokens is a BUILT package — its dist/ is
# consumed by the app, src/index.css and the Tailwind preset — so it MUST be
# built before `vite build`. (@rare-structure-hq/ui and /shared are source-only.)
FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @rare-structure-hq/tokens build
WORKDIR /app/apps/platform-app
RUN bun run build

# ── runtime: serve the static dist/ via Express (serve.js) ───────────────────
# serve.js listens on process.env.PORT (Railway injects it). express is
# installed fresh here (correct-arch) and the app package.json is copied for
# its "type": "module" so serve.js loads as ESM.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --no-package-lock --no-save express@4.21.2
COPY --from=build /app/apps/platform-app/dist ./dist
COPY --from=build /app/apps/platform-app/serve.js ./serve.js
COPY --from=build /app/apps/platform-app/package.json ./package.json
EXPOSE 5173
CMD ["node", "serve.js"]
