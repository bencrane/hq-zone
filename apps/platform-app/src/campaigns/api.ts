/**
 * Campaigns BFF client. POSTs to platform-api which calls core-x's atomic
 * BFF enroll endpoint (apps/core-x/app/routers/bff_campaigns.py).
 *
 * Org + brand are resolved in the BFF from Doppler — the UI passes the
 * campaign config + lead list and gets back the created core-x ids.
 */
import { supabase } from "@/lib/supabase";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function bearer(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return `Bearer ${token}`;
}

export interface EnrollRecipientInput {
  external_id: string;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  person_state?: string | null;
  person_locality?: string | null;
  external_source?: string;
  recipient_type?: "business" | "property" | "person" | "other";
  metadata?: Record<string, unknown>;
}

export interface EnrollListPayload {
  campaign_name: string;
  channel?: "email" | "direct_mail" | "voice_outbound" | "sms";
  provider?: "emailbison" | "lob" | "twilio" | "vapi" | "manual";
  step_name?: string;
  source_label?: string;
  recipients: EnrollRecipientInput[];
  // Operator-authored email step content. Stored on the step's
  // channel_specific_config; rendered at send time with simple
  // {first_name}-style substitution.
  email_subject?: string;
  email_body_text?: string;
  email_body_html?: string;
}

export interface EnrollListResult {
  campaign_id: string;
  channel_campaign_id: string;
  step_id: string;
  recipient_count: number;
  recipients_new: number;
  recipients_existing: number;
  memberships_created: number;
}

export async function enrollList(payload: EnrollListPayload): Promise<EnrollListResult> {
  const res = await fetch(`${API_BASE}/api/v1/campaigns/enroll-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await bearer(),
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`enroll failed: ${res.status} ${text}`);
  }
  const json = JSON.parse(text);
  return json.data as EnrollListResult;
}
