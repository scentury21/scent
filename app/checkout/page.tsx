"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { mapProductRow, type Product, type ProductRow } from "@/lib/products";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { formatNGN } from "@/lib/currency";
import { saveOrder, uid } from "@/lib/store";
import type { DeliveryInfo, Order } from "@/lib/types";

const FREE_SHIPPING_THRESHOLD = 250000;
const SHIPPING_FEE = 5000;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  region: string;
  city: string;
  postal: string;
  address: string;
  landmark: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  countryCode: "NG",
  region: "",
  city: "",
  postal: "",
  address: "",
  landmark: "",
  notes: "",
};

export default function CheckoutPage() {
  const { items, subtotal, clear, hydrated } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [gps, setGps] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);

  const country = useMemo(() => getCountry(form.countryCode), [form.countryCode]);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  /* Optional IP convenience — the customer always stays in control */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) return;
        const data = (await res.json()) as { country_code?: string };
        if (!cancelled && data.country_code && getCountry(data.country_code)) {
          setDetectedCountry(data.country_code);
        }
      } catch {
        /* offline / blocked — manual selection only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Redirect to cart if empty (after hydration) */
  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/cart");
    }
  }, [hydrated, items.length, router]);

  /* Load the live catalog so order items snapshot name/price/size */
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      setCatalog((data ?? []).map((row) => mapProductRow(row as ProductRow)));
    })();
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const useMyLocation = () => {
    setGpsError(null);
    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Precise location captured from your device",
        });
        setGpsError(null);
      },
      () => setGpsError("Location permission denied. You can still enter your address manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Please enter a valid email.";
    if (!form.phone.trim()) return "Please enter your phone number.";
    if (!country) return "Please select your delivery country.";
    if (country.regions.length > 0 && !form.region) return `Please select your ${country.regionLabel.toLowerCase()}.`;
    if (!form.address.trim()) return "Please enter your full street / house address.";
    return null;
  };

  const buildOrder = (reference: string, status: "paid" | "pending"): Order => ({
    id: uid(),
    createdAt: new Date().toISOString(),
    customer: { name: form.name, email: form.email, phone: form.phone },
    items: items.map((i) => {
      const p = catalog.find((x) => x.id === i.productId);
      return {
        productId: i.productId,
        name: p?.name ?? i.productId,
        price: p?.price ?? 0,
        qty: i.qty,
        size: p?.size ?? "",
      };
    }),
    subtotal,
    shipping,
    total,
    currency: "NGN",
    delivery: {
      country: country?.name ?? "",
      countryCode: form.countryCode,
      region: form.region,
      city: form.city,
      postal: form.postal,
      address: form.address,
      landmark: form.landmark,
      notes: form.notes,
      latitude: gps?.lat ?? null,
      longitude: gps?.lng ?? null,
      locationLabel: gps?.label ?? "",
    } satisfies DeliveryInfo,
    payment: { method: "Paystack", status, reference },
    status: status === "paid" ? "pending" : "pending",
  });

  async function saveOrderToDb(order: Order) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inserted, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: order.id,
          customer_name: order.customer.name,
          customer_email: order.customer.email,
          customer_phone: order.customer.phone,
          status: order.status,
          payment_status: order.payment.status,
          payment_reference: order.payment.reference,
          currency: "NGN",
          subtotal_kobo: Math.round(order.subtotal * 100),
          shipping_kobo: Math.round(order.shipping * 100),
          total_kobo: Math.round(order.total * 100),
          delivery_country: order.delivery.country,
          delivery_country_code: order.delivery.countryCode,
          delivery_region: order.delivery.region,
          delivery_city: order.delivery.city,
          delivery_postal: order.delivery.postal,
          delivery_address: order.delivery.address,
          delivery_landmark: order.delivery.landmark,
          delivery_notes: order.delivery.notes,
          delivery_latitude: order.delivery.latitude ?? null,
          delivery_longitude: order.delivery.longitude ?? null,
        })
        .select("id")
        .single();
      if (error || !inserted) return;
      const dbItems = order.items
        .filter((i) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            i.productId
          )
        )
        .map((i) => ({
          order_id: inserted.id,
          product_id: i.productId,
          name: i.name,
          size: i.size,
          price_kobo: Math.round(i.price * 100),
          qty: i.qty,
        }));
      if (dbItems.length > 0) {
        await supabase.from("order_items").insert(dbItems);
      }
    } catch {
      // The localStorage order below is the fallback if anything fails.
    }
  }

  const finishOrder = (order: Order) => {
    saveOrder(order);
    void saveOrderToDb(order);
    clear();
    /* Fire-and-forget backend hooks (no-op in demo mode) */
    void fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: order.payment.reference, orderId: order.id }),
    }).catch(() => {});
    void fetch("/api/whatsapp-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(() => {});
    void fetch("/api/telegram-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(() => {});
    void fetch("/api/push-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(() => {});
    router.push(`/checkout/success?id=${order.id}`);
  };

  const handleDemoPay = () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      setSubmitted(true);
      return;
    }
    setError(null);
    setPaying(true);
    /* Simulate a Paystack charge + server-side verification */
    window.setTimeout(() => {
      const ref = `DEMO-${Date.now().toString(36).toUpperCase()}`;
      const order = buildOrder(ref, "paid");
      finishOrder(order);
    }, 1200);
  };

  const handlePaystack = () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      setSubmitted(true);
      return;
    }
    setError(null);
    setPaying(true);

    const loadPopup = () => {
      if (!window.PaystackPop) {
        setPaying(false);
        setError("Paystack failed to load — you can still order via WhatsApp or demo mode.");
        return;
      }
      const ref = `SC-${Date.now().toString(36).toUpperCase()}`;
      const popup = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: form.email,
        amount: total * 100,
        currency: "NGN",
        ref,
        onSuccess: () => {
          const order = buildOrder(ref, "paid");
          finishOrder(order);
        },
        onCancel: () => {
          setPaying(false);
          setError("Payment cancelled — your order was not placed.");
        },
      });
      popup.openIframe();
    };

    if (window.PaystackPop) {
      loadPopup();
    } else {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = loadPopup;
      script.onerror = () => {
        setPaying(false);
        setError("Paystack failed to load — use demo mode or WhatsApp instead.");
      };
      document.body.appendChild(script);
    }
  };

  const paystackConfigured = PAYSTACK_PUBLIC_KEY.length > 10 && !PAYSTACK_PUBLIC_KEY.includes("your");

  const whatsappText = useMemo(() => {
    const lines = items
      .map((i) => {
        const p = catalog.find((x) => x.id === i.productId);
        return p ? `• ${p.name} (${p.size}) × ${i.qty} — ${formatNGN(p.price * i.qty)}` : "";
      })
      .filter(Boolean);
    const loc = gps ? ` (GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)})` : "";
    return [
      "Hello Scentury21! New order:",
      ...lines,
      `Subtotal: ${formatNGN(subtotal)}`,
      `Total: ${formatNGN(total)}`,
      "",
      "Delivery:",
      `• ${country?.name ?? ""} / ${form.region || ""} / ${form.city || ""}${form.postal ? ` / ${form.postal}` : ""}`,
      `• ${form.address}${form.landmark ? ` (near ${form.landmark})` : ""}${loc}`,
      form.notes ? `• Note: ${form.notes}` : "",
      `Customer: ${form.name} · ${form.phone} · ${form.email}`,
    ]
      .filter(Boolean)
      .join("%0A");
  }, [items, subtotal, total, gps, country, form, catalog]);

  if (!hydrated) {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-zinc-500">Loading checkout…</div>;
  }

  const errFor = (k: keyof FormState) => submitted && !form[k].trim();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Checkout</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Delivery to 40+ countries · precise location, no maps required
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-100">
              <span className="mr-2 text-gold-400">1</span> Contact details
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="input-label" htmlFor="name">Full name *</label>
                <input id="name" className={`input ${errFor("name") ? "border-red-400/60" : ""}`} value={form.name} onChange={set("name")} placeholder="Adaeze Okonkwo" />
              </div>
              <div>
                <label className="input-label" htmlFor="phone">Phone (WhatsApp-ready) *</label>
                <input id="phone" className={`input ${errFor("phone") ? "border-red-400/60" : ""}`} value={form.phone} onChange={set("phone")} placeholder="+234 812 345 6789" />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label" htmlFor="email">Email *</label>
                <input id="email" type="email" className={`input ${errFor("email") ? "border-red-400/60" : ""}`} value={form.email} onChange={set("email")} placeholder="you@email.com" />
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-100">
              <span className="mr-2 text-gold-400">2</span> Delivery location
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              You choose the country — nothing is forced. Region options update automatically.
            </p>

            {detectedCountry && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-2.5 text-xs text-cyan-200">
                <span>🌐 We detected {getCountry(detectedCountry)?.name} — </span>
                <button
                  onClick={() => setForm((f) => ({ ...f, countryCode: detectedCountry }))}
                  className="font-bold underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
                >
                  Use {getCountry(detectedCountry)?.name}
                </button>
                <span className="text-cyan-200/60">/</span>
                <button onClick={() => setDetectedCountry(null)} className="underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100">
                  Choose another country
                </button>
              </div>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="input-label" htmlFor="country">Country *</label>
                <select id="country" className={`input ${errFor("countryCode") ? "border-red-400/60" : ""}`} value={form.countryCode} onChange={set("countryCode")}>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {country && country.regions.length > 0 && (
                <div>
                  <label className="input-label" htmlFor="region">{country.regionLabel} *</label>
                  <select id="region" className={`input ${errFor("region") ? "border-red-400/60" : ""}`} value={form.region} onChange={set("region")}>
                    <option value="">Select {country.regionLabel.toLowerCase()}…</option>
                    {country.regions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="input-label" htmlFor="city">City / LGA</label>
                <input id="city" className="input" value={form.city} onChange={set("city")} placeholder="Lekki Phase 1" />
              </div>
              <div>
                <label className="input-label" htmlFor="postal">Postal / ZIP code</label>
                <input id="postal" className="input" value={form.postal} onChange={set("postal")} placeholder="105102" />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label" htmlFor="address">Full street / house address *</label>
                <input id="address" className={`input ${errFor("address") ? "border-red-400/60" : ""}`} value={form.address} onChange={set("address")} placeholder="12 Admiralty Way, Block B, Flat 4" />
              </div>
              <div>
                <label className="input-label" htmlFor="landmark">Landmark</label>
                <input id="landmark" className="input" value={form.landmark} onChange={set("landmark")} placeholder="Near the roundabout" />
              </div>
              <div>
                <label className="input-label" htmlFor="notes">Delivery instructions</label>
                <input id="notes" className="input" value={form.notes} onChange={set("notes")} placeholder="Call on arrival" />
              </div>
            </div>

            {/* Precise location */}
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">📌 Pin your precise location</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    Uses your device GPS — stored with your order, no map API involved.
                  </div>
                </div>
                <button onClick={useMyLocation} className="btn btn-ghost px-5 py-2.5 text-xs">
                  {gps ? "Re-capture location" : "Use my current location"}
                </button>
              </div>
              {gps && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-300">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
                    ✓ {gps.label} — {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  </span>
                </div>
              )}
              {gpsError && <p className="mt-3 text-xs text-amber-300">{gpsError}</p>}
            </div>
          </section>

          {/* Payment */}
          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-100">
              <span className="mr-2 text-gold-400">3</span> Payment
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Verify your delivery details above before paying — the order is only marked PAID after server-side confirmation.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {paystackConfigured ? (
                <button onClick={handlePaystack} disabled={paying} className="btn btn-gold w-full py-4 text-base">
                  {paying ? "Opening Paystack…" : `Pay ${formatNGN(total)} with Paystack`}
                </button>
              ) : (
                <>
                  <button onClick={handleDemoPay} disabled={paying} className="btn btn-gold w-full py-4 text-base">
                    {paying ? "Verifying payment…" : `Pay ${formatNGN(total)} — Paystack (demo)`}
                  </button>
                  <p className="text-center text-[11px] text-zinc-500">
                    Demo mode — no real charge. Add your <code className="text-gold-300">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code> to activate live payments.
                  </p>
                </>
              )}

              <div className="relative py-1">
                <div className="divider-fade" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-ink-900 px-3 text-[10px] uppercase tracking-widest text-zinc-500">
                  or
                </span>
              </div>

              <a
                href={`https://wa.me/2348028383053?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost w-full py-4 text-base"
              >
                💬 Order manually on WhatsApp
              </a>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="h-fit lg:sticky lg:top-24">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-100">Summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => {
                const p = catalog.find((x) => x.id === i.productId);
                if (!p) return null;
                return (
                  <li key={i.productId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-300">
                      {p.name} <span className="text-zinc-500">× {i.qty}</span>
                    </span>
                    <span className="shrink-0 text-zinc-200">{formatNGN(p.price * i.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="divider-fade my-4" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <dt>Subtotal</dt>
                <dd>{formatNGN(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatNGN(shipping)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <dt className="text-zinc-100">Total</dt>
                <dd className="gold-text">{formatNGN(total)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
              Free shipping on orders over {formatNGN(FREE_SHIPPING_THRESHOLD)}. Country and region data is local — no third-party map API.
            </p>
          </div>
          <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200">
            ← Back to cart
          </Link>
        </div>
      </div>
    </div>
  );
}
