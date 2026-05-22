# platform-app — Vite + React SPA. Railway builds this from the repo root:
# `docker build -f apps/platform-app/Dockerfile <repo-root>`.
# Classic Dockerfile — no BuildKit-only features (Railway's builder rejects
# `RUN --mount`); the uncached install is fine.
#
# Build-time env: Vite reads `VITE_*` env vars at build time and bakes
# them into dist/. Two supported injection paths, picked at build time:
#
#   (a) DOPPLER_TOKEN is set on the Railway service env → wrap the build
#       with `doppler run` to pull VITE_* from Doppler.
#   (b) DOPPLER_TOKEN is absent → fall back to whatever VITE_* env vars
#       Railway already exposes as build ARGs (operator can set them
#       directly on the service in the Railway UI).
#
# This dual path keeps the deploy unblocked while the operator decides
# which secret store to use; both routes feed the same `vite build`.

FROM dopplerhq/cli:3 AS doppler

# ── build: install the workspace, build tokens, then build the Vite app ──────
# Bun reads the root package.json (workspaces: apps/*, packages/*); the whole
# repo is copied first so every member's package.json is present, then one
# install pass. @rare-structure-hq/tokens is a BUILT package — its dist/ is
# consumed by the app, src/index.css and the Tailwind preset — so it MUST be
# built before `vite build`. (@rare-structure-hq/ui and /shared are source-only.)
FROM oven/bun:1.3-alpine AS build
COPY --from=doppler /bin/doppler /usr/local/bin/doppler
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @rare-structure-hq/tokens build
WORKDIR /app/apps/platform-app

# Build-time secrets. Railway promotes service variables declared as ARG
# into the build env, so any subset of these may be set or unset.
ARG DOPPLER_TOKEN
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ENV DOPPLER_TOKEN=$DOPPLER_TOKEN \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

# Run via Doppler when a token is present, else fall through to the
# already-injected ARG values. Either way Vite ends up with the right
# VITE_* env at build time.
RUN if [ -n "$DOPPLER_TOKEN" ]; then \
      doppler run -- bun run build; \
    else \
      bun run build; \
    fi

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
