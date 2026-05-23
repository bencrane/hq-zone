/**
 * Campaigns broker — orchestrates "enroll a list into a campaign" against
 * hq-x's REST surface (apps/hq-x/app/routers/{campaigns,channel_campaigns,
 * channel_campaign_steps}.py).
 *
 * Currently STUBBED — the route validates input and logs the exact
 * HTTP sequence it would send to hq-x, then returns a synthetic
 * envelope so the UI can iterate. Swap to live calls by replacing
 * `stubHxOrchestration` with a function that hits:
 *   1. POST {HX_BASE_URL}/api/v1/recipients/bulk        (when added in hq-x)
 *   2. POST {HX_BASE_URL}/api/v1/campaigns
 *   3. POST {HX_BASE_URL}/api/v1/channel-campaigns
 *   4. POST {HX_BASE_URL}/api/v1/channel-campaign-steps
 *   5. POST {HX_BASE_URL}/api/v1/channel-campaign-steps/{id}/recipients (when added in hq-x)
 *
 * Routes:
 *   POST /enroll-list  → orchestrate create-campaign + attach-recipients
 *   GET  /             → list campaigns (stub: returns synthetic in-memory list)
 *
 * Auth: forwarded JWT (same pattern as sam-opps) once live; today the
 * stub only requires the local Supabase user to be present so we still
 * call `requireUser`.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { requireUser, type AuthVariables } from "../auth.ts";

const RecipientInput = z.object({
  external_id: z.string().min(1),
  display_name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  person_state: z.string().nullable().optional(),
  person_locality: z.string().nullable().optional(),
  // Where this recipient came from in our world ("tam_fixture", "pdl_lance",
  // "blitz_search", etc). hq-x uses this as the `external_source` natural-key part.
  external_source: z.string().default("hq_zone"),
  metadata: z.record(z.unknown()).optional(),
});

const EnrollListBody = z.object({
  campaign_name: z.string().min(1).max(200),
  // hq-x requires brand_id (UUID). The platform-app passes this; if the
  // operator hasn't set up brands yet, the UI surfaces an inline picker.
  brand_id: z.string().uuid(),
  // Initial channel. Email/EmailBison is the only live combo for v1.
  channel: z.enum(["email", "direct_mail", "voice_outbound", "sms"]).default("email"),
  provider: z
    .enum(["emailbison", "lob", "twilio", "vapi", "manual"])
    .default("emailbison"),
  step_name: z.string().min(1).max(200).default("Step 1"),
  source_label: z.string().optional(),
  recipients: z.array(RecipientInput).min(1),
});

type EnrollListPayload = z.infer<typeof EnrollListBody>;

interface StubResult {
  mode: "stub";
  campaign_id: string;
  channel_campaign_id: string;
  step_id: string;
  recipient_count: number;
  would_send: {
    create_campaign: unknown;
    create_channel_campaign: unknown;
    create_step: unknown;
    upsert_recipients_count: number;
    attach_step_recipients_count: number;
  };
}

function uuidv4(): string {
  // Synthetic UUID for stub mode. crypto.randomUUID is available in Bun's runtime.
  return crypto.randomUUID();
}

function stubHxOrchestration(p: EnrollListPayload, userId: string): StubResult {
  // Build the exact payloads that would go to hq-x. Logging them gives the
  // operator a clear contract to point hq-x's REST endpoints at.

  const createCampaign = {
    brand_id: p.brand_id,
    name: p.campaign_name,
    metadata: {
      source: "hq_zone/platform-api",
      source_label: p.source_label,
      created_by_user_id: userId,
    },
  };

  const campaignId = uuidv4();

  const createChannelCampaign = {
    campaign_id: campaignId,
    channel: p.channel,
    provider: p.provider,
    name: `${p.campaign_name} — ${p.channel}/${p.provider}`,
  };
  const channelCampaignId = uuidv4();

  const createStep = {
    channel_campaign_id: channelCampaignId,
    step_order: 1,
    name: p.step_name,
    delay_days_from_previous: 0,
    channel_specific_config: {},
  };
  const stepId = uuidv4();

  const upsertRecipients = p.recipients.map((r) => ({
    external_source: r.external_source,
    external_id: r.external_id,
    recipient_type: "person",
    display_name: r.display_name,
    email: r.email ?? null,
    phone: r.phone ?? null,
    mailing_address: {},
    metadata: {
      ...(r.metadata ?? {}),
      person_state: r.person_state ?? null,
      person_locality: r.person_locality ?? null,
      enrolled_from: "hq_zone",
    },
  }));

  const attachStepRecipients = p.recipients.map((r) => ({
    channel_campaign_step_id: stepId,
    external_source: r.external_source,
    external_id: r.external_id,
  }));

  // Verbose console log so the operator can see exactly what hq-x will receive.
  // Each block is one HTTP POST in the live implementation.
  // eslint-disable-next-line no-console
  console.info("[campaigns.enroll-list:stub] hq-x orchestration plan", {
    user_id: userId,
    sequence: {
      "1_create_campaign": {
        method: "POST",
        url: "{HX_BASE_URL}/api/v1/campaigns",
        body: createCampaign,
      },
      "2_create_channel_campaign": {
        method: "POST",
        url: "{HX_BASE_URL}/api/v1/channel-campaigns",
        body: createChannelCampaign,
      },
      "3_create_step": {
        method: "POST",
        url: "{HX_BASE_URL}/api/v1/channel-campaign-steps",
        body: createStep,
      },
      "4_upsert_recipients_bulk": {
        method: "POST",
        url: "{HX_BASE_URL}/api/v1/recipients/bulk  (needs adding in hq-x)",
        count: upsertRecipients.length,
        sample: upsertRecipients.slice(0, 2),
      },
      "5_attach_step_recipients_bulk": {
        method: "POST",
        url: `{HX_BASE_URL}/api/v1/channel-campaign-steps/${stepId}/recipients  (needs adding in hq-x)`,
        count: attachStepRecipients.length,
      },
    },
  });

  return {
    mode: "stub",
    campaign_id: campaignId,
    channel_campaign_id: channelCampaignId,
    step_id: stepId,
    recipient_count: p.recipients.length,
    would_send: {
      create_campaign: createCampaign,
      create_channel_campaign: createChannelCampaign,
      create_step: createStep,
      upsert_recipients_count: upsertRecipients.length,
      attach_step_recipients_count: attachStepRecipients.length,
    },
  };
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
  const result = stubHxOrchestration(parsed.data, user.user_id);
  return c.json({ data: result }, 201);
});

// Stub listing — returns empty until hq-x integration goes live. Lets the
// UI show "no existing campaigns" honestly.
campaignsRoutes.get("/", async (c) => {
  return c.json({ data: { campaigns: [] } });
});
