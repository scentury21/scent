"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth-shell";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  // Arriving with token_hash/type means the customer clicked the confirmation
  // LINK in the email (instead of typing a code) — verify it right away.
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const finish = useCallback(() => {
    router.push("/shop");
    router.refresh();
  }, [router]);

  /* If the user clicked the email link, complete the verification here. */
  useEffect(() => {
    if (!tokenHash) return;
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      if (cancelled) return;
      setVerifying(true);
      const { error: err } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: (type as "signup" | "email" | "recovery") || "signup",
      });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setVerifying(false);
      } else {
        finish();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type, finish]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");

    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    finish();
  }

  async function handleResend() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  return (
    <AuthShell>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)]">
          S
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">
          {verifying ? "Confirming…" : "Check your email"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {verifying
            ? "Verifying your link — one moment."
            : `Enter the 6-digit code we sent to `}
          {!verifying && (
            <span className="font-semibold text-zinc-200">{email || "your email"}</span>
          )}
          {!verifying && " — or click the confirmation link in the email."}
        </p>

        {!verifying && (
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex justify-center gap-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="input h-14 w-12 text-center text-lg"
                />
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
            {resent && (
              <p className="mt-4 text-sm text-gold-300">Code resent — check your inbox.</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-gold mt-6 w-full py-3.5"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {verifying && (
          <div className="mt-8 flex justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-gold-300" />
          </div>
        )}

        {!verifying && (
          <button
            onClick={handleResend}
            className="mt-5 text-sm text-zinc-400 transition-colors hover:text-gold-200"
          >
            Didn&apos;t get a code? Resend
          </button>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[11px] leading-relaxed text-zinc-500">
          <span className="font-bold text-zinc-400">Didn&apos;t receive the email?</span>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>Check your spam / promotions folder.</li>
            <li>
              The sender must be a <span className="text-zinc-300">verified sender</span> in
              Brevo — unverified senders are silently blocked.
            </li>
            <li>
              Custom SMTP is configured under{" "}
              <span className="text-zinc-300">
                Supabase → Authentication → SMTP
              </span>{" "}
              (host <code className="text-gold-300">smtp-relay.brevo.com</code>, port{" "}
              <code className="text-gold-300">587</code>, user = your Brevo SMTP login, pass =
              SMTP master key).
            </li>
          </ul>
        </div>
      </div>
    </AuthShell>
  );
}
