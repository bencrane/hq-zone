/**
 * Runtime settings for platform-api. Values come from Doppler project
 * `hq-zone` config `prd` (see ../doppler.yaml).
 *
 * PORT lives at the Railway layer — NOT in Doppler. Read separately
 * from process.env.PORT with a local-dev default of 8000.
 */

import { z } from "zod";

const envSchema = z.object({
  // Incoming-JWT validation (user JWTs from platform-app)
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ISSUER: z.string().url(),
  // Outbound to data-engine-x (sam-opps, factory reads — user JWT is
  // forwarded; DEX trusts the same Supabase issuer natively)
  DEX_BASE_URL: z.string().url(),
  DEX_SERVICE_TOKEN: z.string().min(1),
  // Outbound to backend-engine (campaigns, user/org state — service
  // token used for the BFF-to-backend hop)
  BACKEND_X_API_URL: z.string().url(),
  BACKEND_X_SERVICE_TOKEN: z.string().min(1),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  APP_ENV: z.enum(["prd", "stg", "dev"]),
});

function pickAlias(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

const parsed = envSchema.safeParse({
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
  SUPABASE_ISSUER: process.env.SUPABASE_ISSUER,
  DEX_BASE_URL: process.env.DEX_BASE_URL,
  // tolerate DEX_SERVICE_TOKEN_ trailing-underscore variant
  DEX_SERVICE_TOKEN: pickAlias("DEX_SERVICE_TOKEN", "DEX_SERVICE_TOKEN_"),
  BACKEND_X_API_URL: process.env.BACKEND_X_API_URL,
  BACKEND_X_SERVICE_TOKEN: process.env.BACKEND_X_SERVICE_TOKEN,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  APP_ENV: process.env.APP_ENV,
});

if (!parsed.success) {
  console.error("platform-api: env validation failed");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins: string[] = env.ALLOWED_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
