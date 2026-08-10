"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth-shell";

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden="true"
    />
  );
}

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  /* The recovery link already exchanged the token in /auth/callback, so the
     user arrives here signed in. Verify that before showing the form. */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setValidSession(!!data.user);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Please choose a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match — please re-type them.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      console.error("Password update error:", error);
      setError(
        typeof error.message === "string"
          ? error.message
          : "Could not update your password. Please try again."
      );
      return;
    }

    /* Drop the recovery session so the user signs in fresh with the new password. */
    void supabase.auth.signOut();
    setDone(true);
  }

  return (
    <AuthShell>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)]">
          S
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose something new — at least 8 characters.
        </p>
      </div>

      {checking ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : done ? (
        <div className="mt-8 space-y-5 text-center">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-6">
            <div className="text-3xl">✅</div>
            <p className="mt-3 font-semibold text-emerald-100">
              Password updated
            </p>
            <p className="mt-1.5 text-sm text-emerald-200/80">
              You’re all set — sign in with your new password.
            </p>
          </div>
          <Link href="/login" className="btn btn-gold w-full py-3.5">
            Go to sign in →
          </Link>
        </div>
      ) : validSession ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-left text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="input-label" htmlFor="password">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="input pr-12"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-gold-300"
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="confirm">
              Confirm new password
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              className="input"
              placeholder="Re-type your new password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-gold w-full py-3.5"
          >
            {loading ? (
              <>
                <Spinner /> Updating…
              </>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-6 text-center">
          <div className="text-3xl">🔗</div>
          <p className="mt-3 font-semibold text-amber-100">
            This link is invalid or expired
          </p>
          <p className="mt-1.5 text-sm text-amber-200/80">
            Request a fresh reset link and click it again within 10 minutes.
          </p>
          <Link
            href="/forgot-password"
            className="btn btn-gold mt-5 w-full py-3"
          >
            Request a new link
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-zinc-400">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-semibold text-gold-300 hover:text-gold-200"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
