/**
 * Campaigns broker — orchestrates "enroll a list into a campaign" against
 * hq-x's atomic BFF endpoint (apps/hq-x/app/routers/bff_campaigns.py).
 *
 * One HTTP call: POST {HQX_API_URL}/api/v1/bff/campaigns/enroll-list
 * with the org/brand resolved from Doppler. The endpoint runs a single
 * transaction that lands campaign + channel_campaign + first step +
 * recipients + step memberships; partial failures roll back cleanly.
 *
 * Auth: HQX_SERVICE_TOKEN as Authorization. The BFF asserts its own
 * identity to hq-x; no per-user JWT is forwarded (single-operator model).
 *
 * Routes:
 *   POST /enroll-list  → create campaign + enroll recipients atomically
 *   GET  /             → list campaigns (placeholder, returns empty)
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { type AuthVariables, requireUser } from "../auth.ts";
import { env } from "../env.ts";

const RecipientInput = z.object({
  external_id: z.string().min(1),
  display_name: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  person_state: z.string().nullable().optional(),
  person_locality: z.string().nullable().optional(),
  // Where this lead came from in our world ("tam_fixture", "pdl_lance",
  // "blitz_search", etc). hq-x stores this as the `external_source`
  // half of the org-natural-key (organization_id, external_source, external_id).
  external_source: z.string().min(1).max(64).default("hq_zone"),
  recipient_type: z.enum(["business", "property", "person", "other"]).default("person"),
  metadata: z.record(z.unknown()).optional(),
});

const EnrollListBody = z.object({
  campaign_name: z.string().min(1).max(200),
  // Channel/provider whitelist mirrors VALID_CHANNEL_PROVIDER_PAIRS in
  // apps/hq-x/app/models/campaigns.py. The UI selects already pre-pair
  // these; we re-validate here so a hand-crafted curl can't smuggle a
  // bad combo through.
  channel: z.enum(["email", "direct_mail", "voice_outbound", "sms"]).default("email"),
  provider: z.enum(["emailbison", "lob", "twilio", "vapi", "manual"]).default("emailbison"),
  step_name: z.string().min(1).max(200).optional(),
  source_label: z.string().max(200).optional(),
  recipients: z.array(RecipientInput).min(1).max(10_000),
  // Operator-authored content for the first step. hq-x reads this from
  // channel_specific_config at send time. For email/manual mode, the
  // expected keys are subject + body_text + body_html (per
  // ChannelCampaignStepContentMode docs in hq-x/app/models/campaigns.py).
  email_subject: z.string().max(200).optional(),
  email_body_text: z.string().max(50_000).optional(),
  email_body_html: z.string().max(200_000).optional(),
});

type EnrollListPayload = z.infer<typeof EnrollListBody>;

interface EnrollResult {
  campaign_id: string;
  channel_campaign_id: string;
  step_id: string;
  recipient_count: number;
  recipients_new: number;
  recipients_existing: number;
  memberships_created: number;
}

async function callBackendEnrollList(p: EnrollListPayload, userId: string): Promise<EnrollResult> {
  // Channel-specific step content. For email/manual mode hq-x reads
  // {subject, body_text, body_html} from channel_specific_config at
  // send time and runs a simple {first_name}-style substitution.
  const channelSpecificConfig: Record<string, string> = {};
  if (p.email_subject) channelSpecificConfig.subject = p.email_subject;
  if (p.email_body_text) channelSpecificConfig.body_text = p.email_body_text;
  if (p.email_body_html) channelSpecificConfig.body_html = p.email_body_html;

  const upstreamBody = {
    organization_id: env.HQX_DEFAULT_ORG_ID,
    brand_id: env.HQX_DEFAULT_BRAND_ID,
    campaign_name: p.campaign_name,
    channel: p.channel,
    provider: p.provider,
    ...(p.step_name ? { step_name: p.step_name } : {}),
    ...(p.source_label ? { source_label: p.source_label } : {}),
    ...(Object.keys(channelSpecificConfig).length > 0
      ? { channel_specific_config: channelSpecificConfig }
      : {}),
    metadata: {
      created_by_user_id: userId,
      source: "hq_zone/platform-api",
    },
    recipients: p.recipients.map((r) => ({
      external_source: r.external_source,
      external_id: r.external_id,
      recipient_type: r.recipient_type,
      display_name: r.display_name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      mailing_address: {},
      metadata: {
        ...(r.metadata ?? {}),
        ...(r.person_state ? { person_state: r.person_state } : {}),
        ...(r.person_locality ? { person_locality: r.person_locality } : {}),
      },
    })),
  };

  const upstreamUrl = `${env.HQX_API_URL}/api/v1/bff/campaigns/enroll-list`;
  const res = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HQX_SERVICE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamBody),
  });

  const text = await res.text();
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[campaigns.enroll-list] backend-x error", {
      status: res.status,
      body: text.slice(0, 1000),
    });
    throw new HTTPException(res.status as 400 | 401 | 403 | 404 | 500, {
      message: text || `backend-x returned ${res.status}`,
    });
  }

  return JSON.parse(text) as EnrollResult;
}

export const campaignsRoutes = new Hono<{ Variables: AuthVariables }>();

campaignsRoutes.use("*", requireUser);

campaignsRoutes.post("/enroll-list", async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = EnrollListBody.safeParse(raw);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: JSON.stringify(parsed.error.flatten()),
    });
  }
  const user = c.get("user");
  const result = await callBackendEnrollList(parsed.data, user.user_id);
  return c.json({ data: result }, 201);
});

// Listing endpoint placeholder — a follow-up cycle exposes a GET that
// hits hq-x's existing GET /api/v1/campaigns with org scope.
campaignsRoutes.get("/", async (c) => {
  return c.json({ data: { campaigns: [] } });
});
