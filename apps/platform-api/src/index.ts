/**
 * hq-zone platform-api — Hono BFF for the signed-in app.
 *
 * Responsibilities:
 * - Validate hq-zone Supabase JWTs (ES256 + JWKS)
 * - /health (unauthenticated) for liveness probes
 * - /api/v1/me (auth-required) echoes the validated user
 * - /api/v1/sam-opps/* (auth-required) brokers to data-engine-x
 * - /api/v1/coverage/stats (auth-required) brokers to data-engine-x
 *
 * Deferred: Recipient profile, project matching.
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

import { allowedOrigins, env } from "./env.ts";
import { requireUser, type AuthVariables } from "./auth.ts";
import { samOppsRoutes } from "./routes/sam-opps.ts";
import { campaignsRoutes } from "./routes/campaigns.ts";
import { coverageRoutes } from "./routes/coverage.ts";
import { gtmPeopleRoutes } from "./routes/gtm-people.ts";
import { audiencesRoutes } from "./routes/audiences.ts";

const app = new Hono<{ Variables: AuthVariables & { requestId: string } }>();

app.use("*", requestId());

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

app.get("/health", (c) =>
  c.json({ status: "ok", app_env: env.APP_ENV, ts: new Date().toISOString() }),
);

app.get("/api/v1/me", requireUser, (c) => {
  const user = c.get("user");
  return c.json({ user_id: user.user_id, email: user.email, app_env: env.APP_ENV });
});

app.route("/api/v1/sam-opps", samOppsRoutes);
app.route("/api/v1/campaigns", campaignsRoutes);
app.route("/api/v1/coverage", coverageRoutes);
app.route("/api/v1/gtm/people", gtmPeopleRoutes);
app.route("/api/v1/audiences", audiencesRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
// Bind explicitly to 0.0.0.0 so Railway's external healthcheck can reach
// us. @hono/node-server passes `hostname` through to node's server.listen,
// and an undefined hostname binds to localhost-only on Alpine images.
const hostname = "0.0.0.0";
console.log(`platform-api listening on ${hostname}:${port} [${env.APP_ENV}]`);

serve({ fetch: app.fetch, port, hostname });
