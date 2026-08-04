"use client";

import { useState, type ReactNode } from "react";
import { isAdmin, loginAsAdmin } from "@/lib/store";

export default function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => (typeof window !== "undefined" ? isAdmin() : false));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (authed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="glass rounded-2xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 text-2xl">
          🔐
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">Admin sign in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage products, orders, customers and analytics.
        </p>

        <div className="mt-6 space-y-3 text-left">
          <input
            className="input"
            placeholder="admin@scentury21.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={() => {
              loginAsAdmin();
              setAuthed(true);
            }}
            className="btn btn-gold w-full py-3.5"
          >
            Sign in (demo)
          </button>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-zinc-500">
          Demo session — any credentials work locally. In production this is backed by
          Supabase Auth with the admin role enforced in the database (Row Level
          Security), never just in the frontend.
        </p>
      </div>
    </div>
  );
}
