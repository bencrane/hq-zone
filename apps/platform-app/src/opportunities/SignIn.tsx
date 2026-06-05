import { Eye, EyeOff } from "lucide-react";
/**
 * Sign-in surface. Two paths:
 *   1. Email + password — for existing accounts in the Supabase auth.users
 *      pool (e.g., tools@substrate.build).
 *   2. Email-only magic link — fallback for users without a password set.
 *
 * Lives inside the /opportunities route so the existing map route stays
 * unauthenticated.
 */
import { type FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";
import { Button, Card, Page, Stack, Text } from "@rare-structure-hq/ui";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // AuthProvider's onAuthStateChange will flip RequireAuth and route us in.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onMagicLink() {
    if (!email) {
      setErr("Enter your email first.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "magic link failed");
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
            {magicSent ? (
              <Text size="body-md" color="accent">
                Check your inbox — click the link to sign in.
              </Text>
            ) : (
              <form onSubmit={onPasswordSubmit}>
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-10 w-full rounded-none border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-base)] px-3 pr-20 text-body-md text-[color:var(--color-text-strong)] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-accent-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-default)]"
                    >
                      {showPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  <Button type="submit" disabled={submitting || !email || !password}>
                    {submitting ? "Signing in..." : "Sign in"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onMagicLink}
                    disabled={submitting || !email}
                  >
                    Send magic link instead
                  </Button>
                  {err && (
                    <Text size="body-sm" className="text-[color:var(--color-state-error)]">
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
