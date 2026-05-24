/**
 * Runtime settings for platform-api. Values come from Doppler project
 * `hq-zone` config `prd` (see ../doppler.yaml).
 *
 * Architecture: hq-zone-api -> backend-engine -> data-engine-x.
 * The BFF never talks to DEX directly and never touches Supabase
 * other than offline JWT verification.
 *
 * PORT lives at the Railway layer — NOT in Doppler. Read separately
 * from process.env.PORT with a local-dev default of 8000.
 */

import { z } from "zod";

const envSchema = z.object({
  // Incoming-JWT validation (user JWTs from platform-app)
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ISSUER: z.string().url(),
  // Outbound to backend-engine — sole upstream. Service token is the
  // BFF identity; the user's JWT propagates as X-User-Bearer.
  BACKEND_X_API_URL: z.string().url(),
  BACKEND_X_SERVICE_TOKEN: z.string().min(1),
  // Org + brand under which hq-zone-originated campaigns land in hq-x.
  // Both rows already exist in hq-x (business.organizations + business.brands)
  // and are referenced by every BFF enroll-list call.
  HX_DEFAULT_ORG_ID: z.string().uuid(),
  HX_DEFAULT_BRAND_ID: z.string().uuid(),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  APP_ENV: z.enum(["prd", "stg", "dev"]),
});

const parsed = envSchema.safeParse({
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
  SUPABASE_ISSUER: process.env.SUPABASE_ISSUER,
  BACKEND_X_API_URL: process.env.BACKEND_X_API_URL,
  BACKEND_X_SERVICE_TOKEN: process.env.BACKEND_X_SERVICE_TOKEN,
  HX_DEFAULT_ORG_ID: process.env.HX_DEFAULT_ORG_ID,
  HX_DEFAULT_BRAND_ID: process.env.HX_DEFAULT_BRAND_ID,
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
