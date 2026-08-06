"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default function AdminPushSubscribe() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined" &&
    VAPID_PUBLIC_KEY.length > 0;

  const [permission, setPermission] = useState<string>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        setPermission(Notification.permission);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!sub);
      } catch {
        /* service worker unavailable — leave as-is */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMessage("Permission denied — allow notifications for this site in your browser settings, then try again.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Sign in as an admin first.");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) {
        setMessage("Only admins can enable order notifications.");
        return;
      }

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        setMessage(`Could not save subscription: ${error.message}`);
        return;
      }

      setSubscribed(true);
      setMessage("Notifications enabled — you will be alerted on every new order. 🎉");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
      setSubscribed(false);
      setMessage("Notifications disabled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display text-xl font-semibold text-zinc-100">🔔 Order notifications</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Push notifications are not available here — use a modern browser over HTTPS, or set{" "}
          <code className="text-gold-300">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-zinc-100">🔔 Order notifications</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Get a browser notification the moment a customer places an order.
          </p>
        </div>
        {subscribed ? (
          <button
            onClick={disable}
            disabled={busy}
            className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"
          >
            {busy ? "Disabling…" : "Notifications on ✓ — tap to disable"}
          </button>
        ) : (
          <button onClick={enable} disabled={busy} className="btn btn-gold px-5 py-2.5 text-xs">
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        )}
      </div>

      {permission === "denied" && !subscribed && (
        <p className="mt-3 text-xs text-rose-300">
          Notifications are blocked for this site. Allow them in the site settings, then tap enable again.
        </p>
      )}
      {message && (
        <p
          className={`mt-3 text-xs ${
            message.includes("enabled") || message.includes("disabled")
              ? "text-emerald-300"
              : "text-amber-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
