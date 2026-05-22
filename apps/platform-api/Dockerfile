# Doppler CLI via multi-stage COPY from the official image.
# No install.sh, no gpg, no network calls in our build layer.
FROM dopplerhq/cli:3 AS doppler

FROM oven/bun:1.3-slim AS base
COPY --from=doppler /bin/doppler /usr/local/bin/doppler

WORKDIR /app

# Copy workspace root files needed for install
COPY bun.lock package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/platform-api/package.json ./apps/platform-api/

# Install only platform-api + its workspace deps
RUN bun install --frozen-lockfile --filter platform-api

# Copy source after install so source changes don't bust the install cache
COPY packages/shared ./packages/shared
COPY apps/platform-api ./apps/platform-api

WORKDIR /app/apps/platform-api

# Railway injects $PORT at runtime; default to 8000 for local docker runs.
EXPOSE 8000
CMD ["sh", "-c", "doppler run -- bun start"]
