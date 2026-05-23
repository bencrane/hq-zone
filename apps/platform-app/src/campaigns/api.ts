/**
 * Campaigns BFF client. POSTs to platform-api which orchestrates
 * against hq-x.
 *
 * Currently the BFF route is stubbed (logs the hq-x payload sequence and
 * returns synthetic ids). The shape here matches the live contract so the
 * UI doesn't change when the BFF flips to live.
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
  display_name: string;
  email?: string | null;
  phone?: string | null;
  person_state?: string | null;
  person_locality?: string | null;
  external_source?: string;
  metadata?: Record<string, unknown>;
}

export interface EnrollListPayload {
  campaign_name: string;
  brand_id: string;
  channel?: "email" | "direct_mail" | "voice_outbound" | "sms";
  provider?: "emailbison" | "lob" | "twilio" | "vapi" | "manual";
  step_name?: string;
  source_label?: string;
  recipients: EnrollRecipientInput[];
}

export interface EnrollListResult {
  mode: "stub" | "live";
  campaign_id: string;
  channel_campaign_id: string;
  step_id: string;
  recipient_count: number;
  would_send?: unknown;
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
