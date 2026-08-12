import { resend } from "./resend";

/**
 * Shared server-side email sender for customer mail (order confirmations,
 * status updates). Tries Brevo v3 first — the provider already wired up for
 * Supabase auth email — then falls back to Resend.
 *
 * Env vars:
 *   BREVO_API_KEY        — Brevo key from SMTP & API section (same key works
 *                          for the v3 REST API and as SMTP password)
 *   BREVO_SENDER_EMAIL   — sender address verified in Brevo (Senders & IPs)
 *   EMAIL_FROM           — optional "Name <email>" override (default sender)
 *   RESEND_API_KEY       — fallback provider
 */

export type SendMailResult = { ok: true } | { ok: false; reason: string };

/** Sentinel reason used when no provider is configured at all. */
export const NO_PROVIDER_REASON =
  "No email provider configured — set BREVO_API_KEY (or RESEND_API_KEY) in Vercel env.";

type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Optional "Name <email>" or bare email. Falls back to provider defaults. */
  from?: string;
};

function parseSender(from: string | undefined): { email: string; name?: string } {
  const value = from?.trim();
  if (!value) return { email: "" };
  const m = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim() };
  return { email: value };
}

function looksReal(key: string | undefined): key is string {
  return !!key && !/your_|your-/i.test(key);
}

export async function sendMail({ to, subject, html, from }: Mail): Promise<SendMailResult> {
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey && brevoKey.startsWith("xsmtpsib-")) {
    return {
      ok: false,
      reason:
        "BREVO_API_KEY is an SMTP key (xsmtpsib-...) — the REST API needs an API key (xkeysib-...). Generate one at app.brevo.com → Settings → SMTP & API → API Keys tab.",
    };
  }
  if (looksReal(brevoKey)) {
    const sender = parseSender(from ?? process.env.BREVO_SENDER_EMAIL ?? process.env.EMAIL_FROM);
    if (!sender.email) {
      return {
        ok: false,
        reason:
          "Email skipped — set EMAIL_FROM or BREVO_SENDER_EMAIL to a sender verified in Brevo (Senders & IPs).",
      };
    }
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (res.ok) return { ok: true };
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: `Brevo ${res.status}: ${detail.slice(0, 220)}` };
    } catch (err) {
      return {
        ok: false,
        reason: `Brevo request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: from ?? process.env.EMAIL_FROM ?? "SCENTURY21 <onboarding@resend.dev>",
        to,
        subject,
        html,
      });
      if (error) return { ok: false, reason: error.message };
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: `Resend request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { ok: false, reason: NO_PROVIDER_REASON };
}
