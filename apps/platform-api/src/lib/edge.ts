/**
 * edge-api broker — originate deal documents via Documenso.
 *
 * POST {EDGE_API_URL}/api/v1/deals/{handle}/originate
 * Auth: EDGE_API_SERVICE_TOKEN as Authorization.
 */

import { HTTPException } from "hono/http-exception";

import { env } from "../env.ts";

export interface EdgeDealOriginated {
  envelope_id: string;
  document_id: number | null;
  deal_handle: string;
  signing_token: string | null;
  sign_link: string;
  status: string;
  documenso_host: string;
}

export async function edgeOriginateDeal(handle: string): Promise<EdgeDealOriginated> {
  const upstreamUrl = `${env.EDGE_API_URL}/api/v1/deals/${encodeURIComponent(handle)}/originate`;
  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EDGE_API_SERVICE_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[deals.originate] edge-api error", {
      status: res.status,
      body: text.slice(0, 1000),
    });
    throw new HTTPException(res.status as 400 | 401 | 403 | 404 | 422 | 502, {
      message: text || `edge-api returned ${res.status}`,
    });
  }

  return JSON.parse(text) as EdgeDealOriginated;
}
