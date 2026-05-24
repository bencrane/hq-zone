/**
 * Audiences BFF — author and list audience definitions.
 *
 * Storage in v1 is process-local (in-memory Map). Audiences disappear on
 * BFF restart. This is explicitly temporary: the Zod schema in
 * @rare-structure-hq/shared is the contract that the eventual
 * data-engine-x storage will conform to. When that lands, swap this
 * Map for an httpx call to the DEX audience endpoint; nothing else
 * changes shape.
 *
 * Routes:
 *   GET  /                  → list audiences
 *   POST /                  → create audience (validates spec)
 *   GET  /:id               → get one
 *   PATCH /:id              → update fields on an existing audience
 *   DELETE /:id             → remove
 *   GET  /catalog/sources   → return the source catalog (drives UI form)
 */

import { randomUUID } from "node:crypto";

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import {
  AUDIENCE_SOURCE_CATALOG,
  type Audience,
  type AudienceSpec,
  audienceSchema,
  audienceSpecSchema,
} from "@rare-structure-hq/shared";

import { type AuthVariables, requireUser } from "../auth.ts";

// ---------------------------------------------------------------------------
// In-memory store — process-local. Cleared on restart.
// ---------------------------------------------------------------------------

const AUDIENCES = new Map<string, Audience>();

function persistAudience(audience: Audience): void {
  AUDIENCES.set(audience.id, audience);
}

function getOrThrow(id: string): Audience {
  const found = AUDIENCES.get(id);
  if (!found) throw new HTTPException(404, { message: `audience ${id} not found` });
  return found;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const audiencesRoutes = new Hono<{ Variables: AuthVariables }>();

audiencesRoutes.use("*", requireUser);

// GET /catalog/sources — must be declared BEFORE /:id so the literal
// segment takes precedence over the wildcard.
audiencesRoutes.get("/catalog/sources", (c) => {
  return c.json({ sources: AUDIENCE_SOURCE_CATALOG });
});

audiencesRoutes.get("/", (c) => {
  const audiences = Array.from(AUDIENCES.values()).sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  return c.json({ audiences });
});

audiencesRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ audience: getOrThrow(id) });
});

audiencesRoutes.post("/", async (c) => {
  const raw = await c.req.json().catch(() => null);
  if (!raw) {
    throw new HTTPException(400, { message: "invalid JSON body" });
  }
  const parsed = audienceSpecSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: `invalid audience spec: ${JSON.stringify(parsed.error.flatten())}`,
    });
  }
  const spec: AudienceSpec = parsed.data;
  const now = new Date().toISOString();
  const audience: Audience = audienceSchema.parse({
    ...spec,
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    computed_count: null,
    computed_at: null,
  });
  persistAudience(audience);
  return c.json({ audience }, 201);
});

audiencesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = getOrThrow(id);
  const raw = await c.req.json().catch(() => null);
  if (!raw) {
    throw new HTTPException(400, { message: "invalid JSON body" });
  }
  const parsed = audienceSpecSchema.partial().safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: `invalid audience patch: ${JSON.stringify(parsed.error.flatten())}`,
    });
  }
  const updated = audienceSchema.parse({
    ...existing,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });
  persistAudience(updated);
  return c.json({ audience: updated });
});

audiencesRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  getOrThrow(id); // 404 if missing
  AUDIENCES.delete(id);
  return c.json({ deleted: id });
});
