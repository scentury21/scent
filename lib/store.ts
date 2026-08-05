"use client";

import type { Order } from "./types";

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

