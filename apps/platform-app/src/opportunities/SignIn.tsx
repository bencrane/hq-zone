/**
 * Magic-link sign-in. The single auth surface in the platform-app
 * today. Lives inside the /opportunities route so the existing
 * map route stays unauthenticated.
 */
import { useState, type FormEvent } from "react";

import { Button, Card, Page, Stack, Text } from "@rare-structure-hq/ui";
import { supabase } from "@/lib/supabase";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <Stack gap="6" align="center" py="12">
        <Card className="w-full max-w-md p-6">
          <Stack gap="4">
            <Text as="h1" size="display-sm">
              Sign in
            </Text>
            <Text size="body-md" color="muted">
              We'll email you a one-time sign-in link.
            </Text>
            {sent ? (
              <Text size="body-md" color="accent">
                Check your inbox — click the link to sign in.
              </Text>
            ) : (
              <form onSubmit={onSubmit}>
                <Stack gap="3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-10 w-full rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-3 text-body-md text-[color:var(--color-text-strong)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-accent-primary)] focus:outline-none"
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Send sign-in link"}
                  </Button>
                  {err && (
                    <Text
                      size="body-sm"
                      className="text-[color:var(--color-state-error)]"
                    >
                      {err}
                    </Text>
                  )}
                </Stack>
              </form>
            )}
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}
