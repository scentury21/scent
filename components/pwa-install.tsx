"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * PWA install button. Shown on the admin dashboard once the browser fires
 * `beforeinstallprompt` (i.e. the site is installable). Once installed on
 * Android, push notifications arrive even when Chrome is closed — because
 * they're delivered by the OS, not the open browser.
 */
export default function PwaInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!event) return;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      /* prompt not supported — Chrome shows its own UI */
    } finally {
      setBusy(false);
      setEvent(null);
    }
  }

  if (installed || !event) return null;

  return (
    <div className="glass rounded-2xl border border-gold-400/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-zinc-100">📱 Install Scentury21</h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
            Install the store on your phone&apos;s home screen. Order notifications then arrive even
            when Chrome is closed — exactly like a native app.
          </p>
        </div>
        <button onClick={install} disabled={busy} className="btn btn-gold px-5 py-2.5 text-xs">
          {busy ? "Installing…" : "Install app"}
        </button>
      </div>
    </div>
  );
}
