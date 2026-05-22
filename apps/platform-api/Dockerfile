# platform-api — Bun + Hono BFF. Railway builds from the repo root:
# `docker build -f apps/platform-api/Dockerfile <repo-root>`.
#
# Bun reads the ROOT package.json (workspaces: apps/*, packages/*); the
# whole repo MUST be copied first so every workspace member's package.json
# is present (the root pkg references eslint-plugin-rare-structure-hq and
# marketing-site as workspace deps — a partial COPY makes bun fail with
# "Workspace dependency ... not found"). One install pass; runtime then
# executes from source (`bun src/index.ts`).
#
# Doppler CLI is COPYed in from the official image so `doppler run` can
# fetch secrets at startup using DOPPLER_TOKEN injected by Railway. The
# verified binary path inside dopplerhq/cli:3 is /bin/doppler.

FROM dopplerhq/cli:3 AS doppler

FROM oven/bun:1.3-alpine AS base
COPY --from=doppler /bin/doppler /usr/local/bin/doppler

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

WORKDIR /app/apps/platform-api

# Railway injects $PORT at runtime; default to 8000 for local docker runs.
EXPOSE 8000
CMD ["doppler", "run", "--", "bun", "start"]
