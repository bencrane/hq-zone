# platform-api

Hono BFF for the hq-zone signed-in app.

## What it does

- Validates Supabase JWTs (ES256 via JWKS) issued by the `hq-zone` Supabase project
- `/health` — unauthenticated liveness probe
- `/api/v1/me` — returns the authenticated user's `user_id`, `email`, and `app_env`
- `/api/v1/sam-opps/*` — broker to data-engine-x SAM.gov active opportunities:
  - `GET  /api/v1/sam-opps/:notice_id` → opportunity detail
  - `POST /api/v1/sam-opps/search` → filtered/paginated list
  - `POST /api/v1/sam-opps/stats` → aggregation by dimension

  The user's Supabase JWT is forwarded as Bearer to DEX, which trusts hq-x
  Supabase JWTs natively (no service-token hop). DEX response status + body
  are passed through verbatim.

Deferred: Recipient profile, project matching.

## Local dev

```bash
# From monorepo root
bun install

# Secrets via Doppler (project: hq-zone, config: prd or dev)
doppler run --project hq-zone --config dev -- bun run dev
```

## Env vars

Injected by Doppler at runtime. All keys live in the `hq-zone` Doppler project.

| Key | Description |
|-----|-------------|
| `SUPABASE_JWKS_URL` | JWKS endpoint for incoming user-JWT verification |
| `SUPABASE_ISSUER` | Expected `iss` claim on incoming user JWTs |
| `DEX_BASE_URL` | data-engine-x API base URL (sam-opps, factory reads) |
| `DEX_SERVICE_TOKEN` | data-engine-x service token |
| `BACKEND_X_API_URL` | backend-engine API base URL (campaigns, user/org state) |
| `BACKEND_X_SERVICE_TOKEN` | Bearer token for BFF-to-backend-engine calls |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `APP_ENV` | `prd` \| `stg` \| `dev` |

`PORT` is injected by Railway, not Doppler. Defaults to `8000` locally.

## Deployment

Railway service: `platform-api`
Doppler: `hq-zone / prd`

After Railway creates the service, set `DOPPLER_TOKEN`:
```bash
doppler configs tokens create prd-railway --project hq-zone --config prd --plain
```
