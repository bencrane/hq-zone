/**
 * Audiences BFF client. Talks to platform-api `/api/v1/audiences`.
 *
 * Storage is in-memory in the BFF for v1 — audiences disappear on BFF
 * restart. The Zod schema in @rare-structure-hq/shared is the wire
 * contract; when DEX storage lands, this client keeps the same shape.
 */
import type { Audience, AudienceSourceCatalogEntry, AudienceSpec } from "@rare-structure-hq/shared";

import { supabase } from "@/lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

export async function listAudiences(): Promise<Audience[]> {
  const res = await fetch(`${API_BASE}/api/v1/audiences`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ audiences: Audience[] }>(res);
  return body.audiences;
}

export async function getAudience(id: string): Promise<Audience> {
  const res = await fetch(`${API_BASE}/api/v1/audiences/${id}`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ audience: Audience }>(res);
  return body.audience;
}

export async function createAudience(spec: AudienceSpec): Promise<Audience> {
  const res = await fetch(`${API_BASE}/api/v1/audiences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(spec),
  });
  const body = await jsonOrThrow<{ audience: Audience }>(res);
  return body.audience;
}

export async function deleteAudience(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/audiences/${id}`, {
    method: "DELETE",
    headers: { Authorization: await bearer() },
  });
  await jsonOrThrow<{ deleted: string }>(res);
}

export async function listSourceCatalog(): Promise<AudienceSourceCatalogEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/audiences/catalog/sources`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ sources: AudienceSourceCatalogEntry[] }>(res);
  return body.sources;
}
