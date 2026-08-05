"use client";

import { Suspense, useState, useRef } from "react";
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

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

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

    router.push("/shop");
    router.refresh();
  }

  async function handleResend() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
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
          Check your email
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Enter the 6-digit code we sent to{" "}
          <span className="font-semibold text-zinc-200">{email || "your email"}</span>.
        </p>

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

        <button
          onClick={handleResend}
          className="mt-5 text-sm text-zinc-400 transition-colors hover:text-gold-200"
        >
          Didn&apos;t get a code? Resend
        </button>
      </div>
    </AuthShell>
  );
}
