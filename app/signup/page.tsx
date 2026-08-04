"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    setLoading(false);

    if (error) {
      console.error("Signup error:", error);
      setError(error.message || "Something went wrong. Check the browser console for details.");
      return;
    }

    router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=/shop`,
      },
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="glass rounded-2xl p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950">
            S
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Join Scentury21 to explore the collection.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <div>
            <label className="input-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="input"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-gold w-full py-3.5">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="divider-fade flex-1" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="divider-fade flex-1" />
        </div>

        <button onClick={handleGoogleSignup} className="btn btn-ghost w-full py-3.5">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-gold-300 hover:text-gold-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
