"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { getWishlist } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "./theme-toggle";
import ThemeSwitch from "./theme-switch";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track order" },
  { href: "/profile", label: "Profile" },
];

export default function Header() {
  const router = useRouter();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [wishCount, setWishCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const update = () => setWishCount(getWishlist().length);
    update();
    window.addEventListener("focus", update);
    window.addEventListener("scentury:wishlist", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("scentury:wishlist", update);
    };
  }, []);

  /* Bounce the cart icon when something is added from a card/panel */
  useEffect(() => {
    const onAdded = () => {
      setCartBounce(true);
      window.setTimeout(() => setCartBounce(false), 650);
    };
    window.addEventListener("scentury:cart-added", onAdded);
    return () => window.removeEventListener("scentury:cart-added", onAdded);
  }, []);

  /* Lock body scroll while the mobile menu sheet is open */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Close the mobile sheet with Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session?.user);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
    <header className="sticky top-0 z-[70] border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)] transition-transform group-hover:rotate-6">
            S
          </span>
          <span className="truncate font-display text-lg font-bold tracking-[0.12em] text-zinc-100 sm:text-xl sm:tracking-[0.14em]">
            SCENTURY<span className="gold-text">21</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-gold-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {loggedIn ? (
            <button
              onClick={handleSignOut}
              className="hidden sm:flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-gold-400/50 hover:text-gold-200"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/signup"
                className="hidden sm:flex items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 px-4 py-2 text-xs font-bold text-ink-950 shadow-[0_4px_14px_-4px_rgba(212,169,74,0.6)] transition-all hover:brightness-110"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="hidden sm:flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-gold-400/50 hover:text-gold-200"
              >
                Sign in
              </Link>
            </>
          )}

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-gold-400/50 hover:text-gold-200 sm:h-10 sm:w-10"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            {wishCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 px-1 text-[10px] font-bold text-ink-950">
                {wishCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all hover:border-gold-400/50 hover:text-gold-200 sm:h-10 sm:w-10 ${cartBounce ? "cart-bounce" : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 px-1 text-[10px] font-bold text-ink-950">
                {count}
              </span>
            )}
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 md:hidden sm:h-10 sm:w-10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>        </div>
      </div>
    </header>

      {open && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="sheet-backdrop fixed inset-0 z-[55] bg-black/60 md:hidden"
          />
          <nav
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="sheet-in fixed inset-x-0 bottom-0 z-[60] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 px-4 pb-8 pt-3 md:hidden"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-gold-200"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 space-y-2 border-t border-white/[0.06] px-4 pt-3">
              {loggedIn ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-red-400/40 hover:text-red-300"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="block w-full rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 px-4 py-3 text-center text-sm font-bold text-ink-950 transition-all hover:brightness-110"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition-colors hover:border-gold-400/40 hover:text-gold-200"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            {/* Settings — theme lives here on mobile */}
            <div className="mt-2 border-t border-white/[0.06] px-4 pb-1 pt-4">
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                Settings
              </div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">Appearance</div>
                  <div className="text-[11px] text-zinc-500">Light or dark theme</div>
                </div>
                <div className="w-40 shrink-0">
                  <ThemeSwitch />
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
