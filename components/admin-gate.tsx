"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type GateState = "loading" | "signin" | "denied" | "allowed";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />;
}

/**
 * Real admin gate: Google-only sign-in, and access is granted only when the
 * signed-in account has role = 'admin' in public.profiles (set in Supabase).
 * RLS blocks non-admins at the database too, so this UI gate is a second layer.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<GateState>("loading");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    setUser(u);
    if (!u) {
      setState("signin");
      return;
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    setState(isAdmin ? "allowed" : "denied");
  }, []);

  useEffect(() => {
    // Async auth/role check deferred to a microtask (no sync setState in effect).
    void Promise.resolve().then(check);
  }, [check]);

  async function handleGoogle() {
    setError(null);
    setStarting(true);
    try {
      document.cookie = `scentury-next=${encodeURIComponent(
        "/admin"
      )}; path=/; max-age=600; samesite=lax`;
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
    } finally {
      setStarting(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setState("signin");
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (state === "signin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 text-2xl">
            🔐
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">Admin sign in</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Admins sign in with Google. Only accounts granted the admin role in
            Supabase can access the dashboard.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-left text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={starting}
            className="btn btn-gold mt-7 w-full py-3.5 disabled:opacity-70"
          >
            {starting ? (
              <>
                <Spinner /> Connecting to Google…
              </>
            ) : (
              <>
                <GoogleIcon /> Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400/20 to-red-600/20 text-2xl">
            🚫
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">Not authorized</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Signed in as <span className="text-zinc-200">{user?.email}</span> — but this
            account does not have the admin role.
          </p>
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[11px] leading-relaxed text-zinc-500">
            To grant access, an owner must set your role in Supabase:
            <code className="mt-1 block rounded bg-ink-900 px-2 py-1 font-mono text-[10px] text-gold-200">
              update public.profiles set role = &apos;admin&apos; where email =
              &apos;{user?.email}&apos;;
            </code>
          </p>
          <button onClick={handleSignOut} className="btn btn-ghost mt-6 w-full py-3">
            Switch account / sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
