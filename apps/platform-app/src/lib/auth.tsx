/**
 * Auth context — wraps the Supabase session lifecycle.
 *
 * Exposes `useAuth()` returning { session, loading, signOut } and a
 * <RequireAuth> gate that renders <SignIn /> when there is no session.
 *
 * Magic-link sign-in: enter email → Supabase emails a link → click
 * lands back on the SPA, `detectSessionInUrl: true` parses the hash and
 * stores the session. No password forms, no third-party providers.
 */
import type { Session } from "@supabase/supabase-js";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let released = false;

    // Clear `loading` exactly once. RequireAuth renders nothing while loading
    // is true, so if this never runs, every gated route is a blank page that
    // shows only the HQ badge. getSession() can fail to settle two ways — it
    // can reject (corrupt stored token, auth-js internal error) or hang (the
    // Supabase navigator-LockManager deadlocks when another tab holds the auth
    // lock, or a token refresh stalls). The original code (a bare `.then`)
    // handled neither, so either one pinned `loading` true forever.
    const release = () => {
      if (!mounted || released) return;
      released = true;
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("auth: getSession() rejected — falling through to sign-in", err);
      })
      .finally(release);

    // Safety net for the hang case: `.finally` never fires on a promise that
    // never settles, so release the gate after a few seconds regardless. The
    // user lands on SignIn instead of an infinite blank; a late getSession or
    // an onAuthStateChange event still populates `session` and routes them in.
    const releaseTimer = setTimeout(release, 5000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      release();
    });

    return () => {
      mounted = false;
      clearTimeout(releaseTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({ session, loading, signOut }), [session, loading, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
