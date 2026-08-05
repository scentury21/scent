"use client";

import Link from "next/link";
import { useState } from "react";

const WHATSAPP_NUMBER = "2348123456789"; // placeholder business number
const PHONE = "+234 812 345 6789";
const EMAIL = "hello@scentury21.com";

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 9.88 9.9c0 5.44-4.44 9.87-9.89 9.87zm8.42-18.3A11.82 11.82 0 0 0 12.04 0C5.5 0 .16 5.33.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.54 0 11.88-5.33 11.88-11.9 0-3.18-1.24-6.16-3.46-8.4z" />
    </svg>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <footer className="relative z-10 mt-24 border-t border-white/[0.06] bg-ink-900/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950">
                S
              </span>
              <span className="font-display text-lg font-bold tracking-[0.14em] text-zinc-100">
                SCENTURY<span className="gold-text">21</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              The art of scent, perfected. Rare ingredients, hand-blended in small
              batches and delivered to over 40 countries.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Shop</h4>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li><Link href="/shop" className="transition-colors hover:text-gold-200">All fragrances</Link></li>
              <li><Link href="/shop?cat=Extrait de Parfum" className="transition-colors hover:text-gold-200">Extrait de Parfum</Link></li>
              <li><Link href="/shop?cat=Eau de Parfum" className="transition-colors hover:text-gold-200">Eau de Parfum</Link></li>
              <li><Link href="/shop?cat=Eau de Toilette" className="transition-colors hover:text-gold-200">Eau de Toilette</Link></li>
              <li><Link href="/wishlist" className="transition-colors hover:text-gold-200">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Reach Us</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Scentury21!%20I%27d%20like%20to%20place%20an%20order.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition-colors hover:text-emerald-300"
                >
                  <WhatsAppIcon /> WhatsApp — order on chat
                </a>
              </li>
              <li>
                <a href="https://facebook.com/scentury21" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-blue-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://instagram.com/scentury21" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-pink-300">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9c-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/></svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://tiktok.com/@scentury21" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-zinc-100">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .58.05.85.13V9.4a6.33 6.33 0 0 0-.85-.05A6.34 6.34 0 0 0 3.15 15.7a6.34 6.34 0 0 0 10.86 4.43 6.34 6.34 0 0 0 1.98-4.6V8.85a8.17 8.17 0 0 0 4.77 1.52V6.84a4.84 4.84 0 0 1-1.17-.15z"/></svg>
                  TikTok
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-2.5 transition-colors hover:text-gold-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="flex items-center gap-2.5 transition-colors hover:text-gold-200">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {PHONE}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Stay in the loop</h4>
            <p className="mb-4 text-sm text-zinc-400">
              New launches, restocks and private sale codes. No spam, ever.
            </p>
            {done ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                You're on the list — welcome to the house. ✨
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setDone(true);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="input"
                />
                <button type="submit" className="btn btn-gold shrink-0 px-5">
                  Join
                </button>
              </form>
            )}
            <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="rounded-full border border-white/10 px-2.5 py-1">🔒 Paystack secured</span>
              <span className="rounded-full border border-white/10 px-2.5 py-1">🌍 40+ countries</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Scentury21. The art of scent, perfected.</p>
          <p className="flex items-center gap-2">
            <span>Free shipping over ₦250,000</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
