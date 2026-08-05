import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Only ever allow relative, same-site paths — no open redirects. */
function safeRedirect(target: string | null, fallback = "/shop"): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return fallback;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Google / Supabase surface auth failures through these params.
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Where the user wanted to go — stashed in a short-lived cookie by the
  // login/signup page before starting the OAuth flow. Avoids nested query
  // strings (a common cause of mangled redirect URLs / blank pages).
  const cookieStore = await cookies();
  const next = safeRedirect(cookieStore.get("scentury-next")?.value ?? null);

  const toLogin = (message: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", message);
    url.searchParams.set("redirectTo", next);
    const res = NextResponse.redirect(url);
    res.cookies.delete("scentury-next");
    return res;
  };

  if (error || errorDescription) {
    return toLogin(
      errorDescription ||
        "Google sign-in was cancelled or failed. Please try again."
    );
  }

  if (!code) {
    // No code — not an OAuth return at all. Nothing to exchange.
    return toLogin("Google sign-in did not complete. Please try again.");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    return toLogin(
      `Could not finish Google sign-in (${exchangeError.message}). ` +
        "Tip: make sure this site's URL is added under Supabase → Authentication → " +
        "URL Configuration → Redirect URLs (e.g. http://localhost:3000/**)."
    );
  }

  const res = NextResponse.redirect(new URL(next, origin));
  res.cookies.delete("scentury-next");
  return res;
}
