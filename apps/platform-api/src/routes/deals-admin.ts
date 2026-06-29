/**
 * Deals administration — originate documents for signature.
 *
 * Routes:
 *   POST /:handle/originate  → mint prefilled Documenso document for the deal
 */

import { Hono } from "hono";

import { type AuthVariables, requireUser } from "../auth.ts";
import { edgeOriginateDeal, type EdgeDealOriginated } from "../lib/edge.ts";

interface DealOriginatedResponse {
  envelopeId: string;
  documentId: number | null;
  dealHandle: string;
  signingToken: string | null;
  signLink: string;
  status: string;
  documensoHost: string;
}

function mapToCamelCase(edge: EdgeDealOriginated): DealOriginatedResponse {
  return {
    envelopeId: edge.envelope_id,
    documentId: edge.document_id,
    dealHandle: edge.deal_handle,
    signingToken: edge.signing_token,
    signLink: edge.sign_link,
    status: edge.status,
    documensoHost: edge.documenso_host,
  };
}

export const dealsAdminRoutes = new Hono<{ Variables: AuthVariables }>();

dealsAdminRoutes.use("*", requireUser);

dealsAdminRoutes.post("/:handle/originate", async (c) => {
  const handle = c.req.param("handle");
  const result = await edgeOriginateDeal(handle);
  return c.json({ data: mapToCamelCase(result) }, 201);
});
