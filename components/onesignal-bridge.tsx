"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignal?: {
      init?: (config: Record<string, unknown>) => void;
      push?: (fn: () => void) => void;
      User?: { addTag?: (key: string, value: string) => void };
    };
  }
}

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";

/**
 * OneSignal (managed push layer). Completely inert until
 * NEXT_PUBLIC_ONESIGNAL_APP_ID is set in the environment. When enabled, the
 * admin's browser is subscribed via OneSignal and tagged `scentury_admin`, and
 * /api/push-notify switches to OneSignal's delivery so there are never double
 * notifications.
 */
export default function OneSignalBridge() {
  useEffect(() => {
    if (!APP_ID || typeof window === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.onload = () => {
      const OneSignal = window.OneSignal;
      if (!OneSignal?.init) return;
      OneSignal.init({
        appId: APP_ID,
        serviceWorkerPath: "/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          actionMessage: "Get notified the moment a new order comes in.",
          acceptButtonText: "Allow",
          cancelButtonText: "Not now",
        },
      });
      // Tag the admin AFTER the SDK is ready (push queue guarantees ordering),
      // because /api/push-notify filters delivery on this tag.
      const tagAdmin = () => OneSignal.User?.addTag?.("scentury_admin", "true");
      if (typeof OneSignal.push === "function") {
        OneSignal.push(() => tagAdmin());
      } else {
        tagAdmin();
      }
    };
    document.head.appendChild(script);
  }, []);

  return null;
}
