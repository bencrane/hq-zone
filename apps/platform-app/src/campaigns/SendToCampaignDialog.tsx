/**
 * "Send to campaign" dialog — captures campaign params and POSTs the
 * full recipient batch to the platform-api orchestrator.
 *
 * Caller supplies the recipients (already-resolved person rows). The
 * dialog handles campaign metadata + channel choice. Brand + org are
 * resolved server-side from Doppler (single-operator model), so the
 * dialog doesn't need a brand picker today.
 */
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type EnrollListResult, type EnrollRecipientInput, enrollList } from "./api";

interface SendToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: EnrollRecipientInput[];
  sourceLabel: string;
  defaultCampaignName?: string;
}

export function SendToCampaignDialog({
  open,
  onOpenChange,
  recipients,
  sourceLabel,
  defaultCampaignName,
}: SendToCampaignDialogProps) {
  const [campaignName, setCampaignName] = useState(defaultCampaignName ?? "");
  const [stepName, setStepName] = useState("Step 1");
  const [channel, setChannel] = useState<"email" | "direct_mail" | "voice_outbound" | "sms">(
    "email",
  );
  const [provider, setProvider] = useState<"emailbison" | "lob" | "twilio" | "vapi" | "manual">(
    "emailbison",
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollListResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setCampaignName(defaultCampaignName ?? "");
    setStepName("Step 1");
    setChannel("email");
    setProvider("emailbison");
    setErr(null);
    setResult(null);
    setSubmitting(false);
  }, [open, defaultCampaignName]);

  // Keep provider sensible when channel changes.
  useEffect(() => {
    if (channel === "email") setProvider("emailbison");
    else if (channel === "direct_mail") setProvider("lob");
    else if (channel === "voice_outbound") setProvider("vapi");
    else if (channel === "sms") setProvider("twilio");
  }, [channel]);

  const canSubmit = campaignName.trim().length > 0 && recipients.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    setResult(null);
    try {
      const r = await enrollList({
        campaign_name: campaignName.trim(),
        channel,
        provider,
        step_name: stepName.trim() || "Step 1",
        source_label: sourceLabel,
        recipients,
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "enroll failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send to campaign</DialogTitle>
          <DialogDescription>
            Enrolls {recipients.length} {recipients.length === 1 ? "person" : "people"} from{" "}
            <span className="text-white">{sourceLabel}</span> into a new campaign in hq-x.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <div className="text-emerald-300">
              Enrolled — {result.recipient_count}{" "}
              {result.recipient_count === 1 ? "person" : "people"} ({result.recipients_new} new,{" "}
              {result.recipients_existing} existing).
            </div>
            <div className="space-y-1 font-mono text-xs text-white/70">
              <div>campaign_id: {result.campaign_id}</div>
              <div>channel_campaign_id: {result.channel_campaign_id}</div>
              <div>step_id: {result.step_id}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-name">Campaign name</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q3 outbound — defense primes"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="channel">Channel</Label>
                <select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as typeof channel)}
                  className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
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
                  onChange={(e) => setProvider(e.target.value as typeof provider)}
                  className="h-9 w-full rounded-md border border-white/15 bg-transparent px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                >
                  <option value="emailbison">EmailBison</option>
                  <option value="lob">Lob</option>
                  <option value="twilio">Twilio</option>
                  <option value="vapi">Vapi</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="step-name">First step name</Label>
              <Input
                id="step-name"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                placeholder="e.g. Intro email — day 0"
              />
            </div>

            {err && (
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-sm text-red-300">
                {err}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting
                ? "Enrolling…"
                : `Enroll ${recipients.length} ${recipients.length === 1 ? "person" : "people"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
