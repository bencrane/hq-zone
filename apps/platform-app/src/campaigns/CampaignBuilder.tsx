/**
 * Campaign builder — `/campaigns/new`. Full-page form for end-to-end
 * campaign creation: pick a saved lead list, set channel + provider,
 * author the first step's content, submit.
 *
 * Submits via the same platform-api `/api/v1/campaigns/enroll-list`
 * endpoint as the in-table "Send to campaign" action — the BFF forwards
 * subject + body content as channel_specific_config on the first step.
 * hq-x stores it on business.channel_campaign_steps.channel_specific_config
 * and substitutes {first_name} (etc.) at send time.
 *
 * Sections:
 *   1. Audience — dropdown of localStorage-backed lead lists.
 *   2. Campaign — name, channel, provider.
 *   3. Content — subject + body. Email-only in v1; other channels show
 *      a placeholder until their content shape lands.
 *
 * One step today (matches the BFF endpoint). Multi-step authoring is
 * a follow-up that extends hq-x's atomic enroll-list to accept N steps.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LeadList, listLists, subscribe } from "@/lib/leadLists";
import { TAM_FIXTURE } from "@/tam/fixture";
import { Box, Button, Inline, Page, Stack, Text } from "@rare-structure-hq/ui";

import { type EnrollListResult, type EnrollRecipientInput, enrollList } from "./api";

type Channel = "email" | "direct_mail" | "voice_outbound" | "sms";
type Provider = "emailbison" | "lob" | "twilio" | "vapi" | "manual";

const DEFAULT_PROVIDER_FOR_CHANNEL: Record<Channel, Provider> = {
  email: "emailbison",
  direct_mail: "lob",
  voice_outbound: "vapi",
  sms: "twilio",
};

function resolveRecipients(list: LeadList): EnrollRecipientInput[] {
  const idx = new Map(TAM_FIXTURE.map((r) => [r.person_id, r]));
  return list.person_ids
    .map((id) => idx.get(id))
    .filter((r): r is (typeof TAM_FIXTURE)[number] => Boolean(r))
    .map((m) => ({
      external_source: "hq_zone.tam_fixture",
      external_id: m.person_id,
      display_name: m.full_name,
      email: m.email,
      person_state: m.person_state,
      person_locality: m.person_locality,
      metadata: {
        title: m.title,
        seniority_band: m.seniority_band,
        function: m.function,
        company_name: m.company_name,
        company_id: m.company_id,
        industry: m.industry,
      },
    }));
}

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<LeadList[]>(() => listLists());
  const [listId, setListId] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [provider, setProvider] = useState<Provider>("emailbison");
  const [stepName, setStepName] = useState("Step 1 — intro");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollListResult | null>(null);

  useEffect(() => subscribe(setLists), []);

  // Keep provider sensible when channel flips.
  useEffect(() => {
    setProvider(DEFAULT_PROVIDER_FOR_CHANNEL[channel]);
  }, [channel]);

  const selectedList = useMemo(() => lists.find((l) => l.id === listId) ?? null, [lists, listId]);

  const recipients = useMemo(
    () => (selectedList ? resolveRecipients(selectedList) : []),
    [selectedList],
  );

  const isEmail = channel === "email";

  const canSubmit =
    !submitting &&
    campaignName.trim().length > 0 &&
    recipients.length > 0 &&
    (!isEmail || (subject.trim().length > 0 && bodyText.trim().length > 0));

  async function handleSubmit() {
    if (!canSubmit || !selectedList) return;
    setSubmitting(true);
    setErr(null);
    setResult(null);
    try {
      const r = await enrollList({
        campaign_name: campaignName.trim(),
        channel,
        provider,
        step_name: stepName.trim() || "Step 1",
        source_label: `list:${selectedList.name}`,
        recipients,
        ...(isEmail
          ? {
              email_subject: subject.trim(),
              email_body_text: bodyText.trim(),
            }
          : {}),
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "enroll failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────
  if (result) {
    return (
      <Page variant="default">
        <Stack gap="6">
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Campaign created
            </Text>
            <Text size="body-sm" color="muted">
              {result.recipient_count} {result.recipient_count === 1 ? "recipient" : "recipients"}{" "}
              enrolled ({result.recipients_new} new, {result.recipients_existing} existing).
            </Text>
          </Stack>

          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3">
              <Text size="body-sm" color="muted">
                hq-x ids
              </Text>
              <Stack gap="1">
                <Text size="mono-sm">campaign_id: {result.campaign_id}</Text>
                <Text size="mono-sm">channel_campaign_id: {result.channel_campaign_id}</Text>
                <Text size="mono-sm">step_id: {result.step_id}</Text>
              </Stack>
              <Text size="body-sm" color="muted">
                The step is in <span className="text-white">pending</span> status — it won't fire
                until the step is activated in hq-x.
              </Text>
            </Stack>
          </Box>

          <Inline gap="3">
            <Button onClick={() => navigate("/")}>Back to HQ</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setCampaignName("");
                setStepName("Step 1 — intro");
                setSubject("");
                setBodyText("");
              }}
            >
              Build another
            </Button>
          </Inline>
        </Stack>
      </Page>
    );
  }

  // ── Empty-lists state ────────────────────────────────────────────
  if (lists.length === 0) {
    return (
      <Page variant="default">
        <Stack gap="6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              ← Back to HQ
            </Button>
          </Link>
          <Stack gap="1">
            <Text as="h1" size="display-sm">
              Build a campaign
            </Text>
            <Text size="body-sm" color="muted">
              You need a saved lead list to enroll.
            </Text>
          </Stack>
          <Box border="subtle" p="6" rounded="xl">
            <Stack gap="3" align="start">
              <Text size="body-md">No lead lists yet.</Text>
              <Text size="body-sm" color="muted">
                Head to TAM, filter people, and save them as a list. Then come back here.
              </Text>
              <Inline gap="3">
                <Link to="/tam">
                  <Button size="sm">Open TAM</Button>
                </Link>
                <Link to="/lists">
                  <Button size="sm" variant="secondary">
                    Open Lists
                  </Button>
                </Link>
              </Inline>
            </Stack>
          </Box>
        </Stack>
      </Page>
    );
  }

  // ── Builder ──────────────────────────────────────────────────────
  return (
    <Page variant="default">
      <Stack gap="8">
        <Stack gap="2">
          <Link to="/">
            <Button variant="ghost" size="sm">
              ← Back to HQ
            </Button>
          </Link>
          <Text as="h1" size="display-sm">
            Build a campaign
          </Text>
          <Text size="body-sm" color="muted">
            Pick a list, author the first message, and enroll. Lands in hq-x as a campaign + channel
            campaign + step in <span className="text-white">pending</span> status.
          </Text>
        </Stack>

        {/* 1. Audience */}
        <Stack gap="3">
          <Stack gap="1">
            <Text as="h2" size="display-xs">
              1. Audience
            </Text>
            <Text size="body-sm" color="muted">
              Choose a saved list. Members resolve from local TAM data.
            </Text>
          </Stack>
          <div className="space-y-1.5">
            <Label htmlFor="list-select">List</Label>
            <select
              id="list-select"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="h-10 w-full rounded-md border border-white/15 bg-transparent px-2 text-body-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <option value="">— pick a list —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.person_ids.length})
                </option>
              ))}
            </select>
            {selectedList && (
              <Text size="body-sm" color="muted">
                {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"} resolved.
                {recipients.length < selectedList.person_ids.length && (
                  <span className="text-amber-300">
                    {" "}
                    ({selectedList.person_ids.length - recipients.length} could not be resolved from
                    the local TAM fixture and will be skipped.)
                  </span>
                )}
              </Text>
            )}
          </div>
        </Stack>

        {/* 2. Campaign */}
        <Stack gap="3">
          <Stack gap="1">
            <Text as="h2" size="display-xs">
              2. Campaign
            </Text>
            <Text size="body-sm" color="muted">
              Name + channel for this outreach effort.
            </Text>
          </Stack>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input
              id="campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Q3 outbound — defense primes"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <select
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-body-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
              >
                <option value="email">Email</option>
                <option value="direct_mail">Direct mail</option>
                <option value="voice_outbound">Voice (outbound)</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-body-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
              >
                <option value="emailbison">EmailBison</option>
                <option value="lob">Lob</option>
                <option value="twilio">Twilio</option>
                <option value="vapi">Vapi</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </Stack>

        {/* 3. Step content */}
        <Stack gap="3">
          <Stack gap="1">
            <Text as="h2" size="display-xs">
              3. First step
            </Text>
            <Text size="body-sm" color="muted">
              What gets sent on touch #1. Multi-step sequences land in a follow-up cycle.
            </Text>
          </Stack>
          <div className="space-y-1.5">
            <Label htmlFor="step-name">Step name (internal)</Label>
            <Input
              id="step-name"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g. Intro — day 0"
            />
          </div>

          {isEmail ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Quick question about {company_name}"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Body</Label>
                <textarea
                  id="body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={12}
                  placeholder={
                    "Hey {first_name},\n\nNoticed {company_name} is …\n\nWorth a 15-minute chat next week?\n\n— Ben"
                  }
                  className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-body-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
                <Text size="body-sm" color="muted">
                  Plain text for v1. Tokens like{" "}
                  <span className="font-mono text-white">{"{first_name}"}</span> are substituted at
                  send time by hq-x.
                </Text>
              </div>
            </>
          ) : (
            <Box border="subtle" p="4" rounded="xl">
              <Text size="body-sm" color="muted">
                Content authoring for <span className="text-white">{channel}</span> is not wired yet
                — the step lands in hq-x with empty config and is ready for the operator to fill in
                later. For an end-to-end send today, pick <span className="text-white">Email</span>.
              </Text>
            </Box>
          )}
        </Stack>

        {err && (
          <Box border="subtle" p="3" rounded="xl" unsafe_className="border-red-500/40 bg-red-500/5">
            <Text size="body-sm" color="muted">
              <span className="text-red-300">{err}</span>
            </Text>
          </Box>
        )}

        <Inline gap="3">
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "Creating…" : `Create campaign · enroll ${recipients.length}`}
          </Button>
          <Link to="/">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </Inline>
      </Stack>
    </Page>
  );
}
