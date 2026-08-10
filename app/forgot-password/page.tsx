"use client";

import { useState } from "react";
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

/** Never show raw error objects — map to something a customer can act on. */
function friendlyError(error: { message?: unknown; status?: number }): string {
  const raw = typeof error.message === "string" ? error.message : "";
  const low = raw.toLowerCase();
  if (
    error.status === 500 ||
    low.includes("smtp") ||
    low.includes("confirmation email") ||
    low.includes("unexpected_failure")
  ) {
    return "We couldn’t send the reset email right now. Please try again in a few minutes.";
  }
  if (low.includes("rate") || low.includes("too many")) {
    return "Too many requests — please wait a minute and try again.";
  }
  if (low.includes("valid email")) {
    return "Please enter a valid email address.";
  }
  return raw || "Something went wrong. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendResetLink() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      console.error("Reset request error:", error);
      setError(friendlyError(error));
      return;
    }

    setSent(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendResetLink();
  }

  return (
    <AuthShell>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)]">
          S
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          We’ll email you a secure link to set a new password.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-left text-sm text-red-300">
          {error}
        </div>
      )}

      {sent ? (
        <div className="mt-8 space-y-4 text-center">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-6 text-sm text-emerald-200">
            <div className="text-3xl">📬</div>
            <p className="mt-3 font-semibold text-emerald-100">
              Check your inbox
            </p>
            <p className="mt-1.5 leading-relaxed text-emerald-200/80">
              If an account exists for{" "}
              <span className="font-semibold text-emerald-100">{email}</span>,
              a password-reset link is on its way. It expires in 10 minutes.
            </p>
            <p className="mt-3 text-xs text-emerald-200/60">
              Didn’t see it? Check spam, or request another link.
            </p>
          </div>
          <button
            onClick={() => {
              setSent(false);
              void sendResetLink();
            }}
            disabled={loading}
            className="text-xs font-semibold text-gold-300 transition-colors hover:text-gold-200"
          >
            {loading ? "Sending…" : "Resend link"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <div>
            <label className="input-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-gold w-full py-3.5"
          >
            {loading ? (
              <>
                <Spinner /> Sending link…
              </>
            ) : (
              "Email me a reset link"
            )}
          </button>
        </form>
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
