/**
 * Views BFF client. Talks to platform-api `/api/v1/views`.
 *
 * Storage + materialization + compute all live in DEX (via hq-x). This
 * client is a thin fetch wrapper; the wire shape is the View Zod schema in
 * @rare-structure-hq/shared.
 *
 * The source catalog is FETCHED from the backend (Polaris-driven, 139+
 * Lance datasets + virtual overlays) rather than imported as a TS constant.
 * Iterating on the catalog (adding a new source, retiring one) no longer
 * requires a frontend deploy.
 */
import type { View, ViewSourceCatalogEntry, ViewSpec } from "@rare-structure-hq/shared";

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

export async function listViews(): Promise<View[]> {
  const res = await fetch(`${API_BASE}/api/v1/views`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ views: View[] }>(res);
  return body.views;
}

export async function getView(id: string): Promise<View> {
  const res = await fetch(`${API_BASE}/api/v1/views/${id}`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ view: View }>(res);
  return body.view;
}

export async function createView(spec: ViewSpec): Promise<View> {
  const res = await fetch(`${API_BASE}/api/v1/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(spec),
  });
  const body = await jsonOrThrow<{ view: View }>(res);
  return body.view;
}

export async function deleteView(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/views/${id}`, {
    method: "DELETE",
    headers: { Authorization: await bearer() },
  });
  await jsonOrThrow<{ deleted: string }>(res);
}

export async function computeView(id: string): Promise<View> {
  const res = await fetch(`${API_BASE}/api/v1/views/${id}/compute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: "{}",
  });
  const body = await jsonOrThrow<{ view: View }>(res);
  return body.view;
}

export async function materializeView(id: string): Promise<View> {
  const res = await fetch(`${API_BASE}/api/v1/views/${id}/materialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: "{}",
  });
  const body = await jsonOrThrow<{ view: View }>(res);
  return body.view;
}

export async function listSourceCatalog(): Promise<ViewSourceCatalogEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/views/catalog/sources`, {
    headers: { Authorization: await bearer() },
  });
  const body = await jsonOrThrow<{ sources: ViewSourceCatalogEntry[] }>(res);
  return body.sources;
}

export async function refreshSourceCatalog(): Promise<ViewSourceCatalogEntry[]> {
  const res = await fetch(`${API_BASE}/api/v1/views/catalog/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: "{}",
  });
  const body = await jsonOrThrow<{ sources: ViewSourceCatalogEntry[] }>(res);
  return body.sources;
}
