"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrders, getWishlist } from "@/lib/store";
import { formatNGN, formatDate } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  processing: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  shipped: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/30",
};

function displayName(user: User): string {
  const meta = user.user_metadata ?? {};
  return (meta.full_name as string) || (meta.name as string) || "";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orders = getOrders();
  const wishCount = getWishlist().length;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const u = data.user;
        setUser(u);
        if (u) setPhone((u.user_metadata?.phone as string) || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ data: { phone } });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="glass h-48 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <div className="glass rounded-2xl p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-2xl font-bold text-ink-950">
            S
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">Your profile</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Sign in to see your details, orders and wishlist.
          </p>
          <Link href="/login?redirectTo=/profile" className="btn btn-gold mt-6 w-full py-3.5">
            Sign in
          </Link>
          <p className="mt-4 text-sm text-zinc-400">
            New here?{" "}
            <Link href="/signup?redirectTo=/profile" className="text-gold-300 hover:text-gold-200">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const name = displayName(user);
  const email = user.email || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">My profile</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="glass h-fit rounded-2xl p-6 lg:col-span-1">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-2xl font-bold text-ink-950">
              {(name || "S").charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="font-display text-xl font-semibold text-zinc-100">
                {name || "Welcome"}
              </div>
              <div className="text-xs text-zinc-500">{email || "Signed in"}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="input-label" htmlFor="p-name">Name</label>
              <input id="p-name" className="input opacity-60" value={name} disabled readOnly />
            </div>
            <div>
              <label className="input-label" htmlFor="p-email">Email</label>
              <input id="p-email" type="email" className="input opacity-60" value={email} disabled readOnly />
            </div>
            <div>
              <label className="input-label" htmlFor="p-phone">Phone</label>
              <input id="p-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 812 345 6789" />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Name and email come from your account — only your phone number can be changed here.
              </p>
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button onClick={handleSave} disabled={saving} className={`btn w-full ${saved ? "border border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "btn-gold"}`}>
              {saved ? "Saved ✓" : saving ? "Saving..." : "Save details"}
            </button>
          </div>

          <div className="divider-fade my-6" />

          <Link href="/wishlist" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-gold-400/40 hover:text-gold-200">
            <span>❤️ Wishlist</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{wishCount}</span>
          </Link>

        </div>

        {/* Order history */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-zinc-100">Order history</h2>

          {orders.length === 0 ? (
            <div className="glass mt-4 rounded-2xl p-12 text-center">
              <div className="text-4xl">📦</div>
              <p className="mt-3 text-zinc-400">No orders yet — your first scent awaits.</p>
              <Link href="/shop" className="btn btn-gold mt-6">Shop now</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm text-gold-300">{o.id}</span>
                      <span className="ml-3 text-xs text-zinc-500">{formatDate(o.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[o.status]}`}>
                        {o.status}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${o.payment.status === "paid" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
                        {o.payment.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                    {o.items.map((i) => (
                      <li key={i.productId} className="flex justify-between">
                        <span>{i.name} × {i.qty}</span>
                        <span className="text-zinc-300">{formatNGN(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="divider-fade my-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      {o.delivery.country}{o.delivery.region ? ` · ${o.delivery.region}` : ""}
                      {o.delivery.city ? ` · ${o.delivery.city}` : ""}
                    </span>
                    <span className="font-bold gold-text">{formatNGN(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
