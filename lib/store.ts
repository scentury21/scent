"use client";

import type { Customer, Order, Product } from "./types";
import { PRODUCTS } from "./products";

/* ------------------------------------------------------------------ */
/* Small localStorage helpers (client-only, SSR-safe)                  */
/* ------------------------------------------------------------------ */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function uid(prefix = "SC"): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

const PROFILE_KEY = "scentury21_profile";

export type Profile = { name: string; email: string; phone: string };

const DEFAULT_PROFILE: Profile = { name: "", email: "", phone: "" };

export function getProfile(): Profile {
  return read<Profile>(PROFILE_KEY, DEFAULT_PROFILE);
}

export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

const ORDERS_KEY = "scentury21_orders";

export function getOrders(): Order[] {
  return read<Order[]>(ORDERS_KEY, []);
}

export function saveOrder(order: Order) {
  const orders = getOrders();
  orders.unshift(order);
  write(ORDERS_KEY, orders);
}

export function getOrder(id: string): Order | undefined {
  return getOrders().find((o) => o.id === id);
}

export function updateOrderStatus(id: string, status: Order["status"]) {
  const orders = getOrders().map((o) => (o.id === id ? { ...o, status } : o));
  write(ORDERS_KEY, orders);
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

const WISHLIST_KEY = "scentury21_wishlist";

export function getWishlist(): string[] {
  return read<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(productId: string): boolean {
  const list = getWishlist();
  const exists = list.includes(productId);
  const next = exists ? list.filter((id) => id !== productId) : [...list, productId];
  write(WISHLIST_KEY, next);
  return !exists;
}

export function isWishlisted(productId: string): boolean {
  return getWishlist().includes(productId);
}

/* ------------------------------------------------------------------ */
/* Product overlay — admin edits persist on top of the demo catalog    */
/* ------------------------------------------------------------------ */

const OVERLAY_KEY = "scentury21_product_overlay";

export function getProducts(): Product[] {
  const overlay = read<Record<string, Product>>(OVERLAY_KEY, {});
  const overlayIds = new Set(Object.keys(overlay));
  const base = PRODUCTS.filter((p) => !overlayIds.has(p.id));
  return [...base, ...Object.values(overlay)];
}

export function saveProduct(product: Product) {
  const overlay = read<Record<string, Product>>(OVERLAY_KEY, {});
  overlay[product.id] = product;
  write(OVERLAY_KEY, overlay);
}

export function deleteProduct(id: string) {
  const overlay = read<Record<string, Product>>(OVERLAY_KEY, {});
  delete overlay[id];
  write(OVERLAY_KEY, overlay);
}

/* ------------------------------------------------------------------ */
/* Customers (derived from orders + profile)                           */
/* ------------------------------------------------------------------ */

export function getCustomers(): Customer[] {
  const orders = getOrders();
  const byEmail = new Map<string, Customer>();
  for (const order of orders) {
    const key = order.customer.email.toLowerCase();
    const existing = byEmail.get(key);
    const spent = order.total;
    if (existing) {
      existing.orders += 1;
      existing.totalSpent += spent;
    } else {
      byEmail.set(key, {
        id: uid("CUST"),
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        country: order.delivery.country,
        orders: 1,
        totalSpent: spent,
        joined: order.createdAt,
      });
    }
  }
  return Array.from(byEmail.values());
}

/* ------------------------------------------------------------------ */
/* Demo admin session                                                  */
/* ------------------------------------------------------------------ */

const ADMIN_KEY = "scentury21_admin";

export function isAdmin(): boolean {
  return read<boolean>(ADMIN_KEY, false);
}

export function loginAsAdmin() {
  write(ADMIN_KEY, true);
}

export function logoutAdmin() {
  write(ADMIN_KEY, false);
}
