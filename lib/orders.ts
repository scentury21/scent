import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

/**
 * Live order helpers — read the signed-in customer's orders straight from
 * Supabase (RLS already scopes reads to `user_id = auth.uid()`), so status
 * changes made in the admin panel show up immediately.
 */

type OrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  payment_reference: string | null;
  currency: string | null;
  subtotal_kobo: number;
  shipping_kobo: number;
  total_kobo: number;
  delivery_country: string;
  delivery_country_code: string;
  delivery_region: string;
  delivery_city: string;
  delivery_postal: string;
  delivery_address: string;
  delivery_landmark: string;
  delivery_notes: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  created_at: string;
};

type ItemRow = {
  order_id: string;
  product_id: string | null;
  name: string;
  size: string;
  price_kobo: number;
  qty: number;
};

export function mapOrderRow(row: OrderRow, items: ItemRow[]): Order {
  return {
    id: row.order_number,
    createdAt: row.created_at,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    items: items.map((i) => ({
      productId: i.product_id ?? "",
      name: i.name,
      price: (i.price_kobo ?? 0) / 100,
      qty: i.qty,
      size: i.size ?? "",
    })),
    subtotal: (row.subtotal_kobo ?? 0) / 100,
    shipping: (row.shipping_kobo ?? 0) / 100,
    total: (row.total_kobo ?? 0) / 100,
    currency: (row.currency as Order["currency"]) ?? "NGN",
    delivery: {
      country: row.delivery_country,
      countryCode: row.delivery_country_code,
      region: row.delivery_region,
      city: row.delivery_city,
      postal: row.delivery_postal,
      address: row.delivery_address,
      landmark: row.delivery_landmark,
      notes: row.delivery_notes,
      latitude: row.delivery_latitude,
      longitude: row.delivery_longitude,
    },
    payment: {
      method: "Paystack",
      status: row.payment_status === "paid" ? "paid" : "pending",
      reference: row.payment_reference ?? "",
    },
    status: row.status as Order["status"],
  };
}

/** All of the signed-in user's orders, newest first. */
export async function fetchMyOrders(): Promise<Order[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!rows || rows.length === 0) return [];

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("order_id, product_id, name, size, price_kobo, qty")
    .in(
      "order_id",
      rows.map((r) => r.id)
    );

  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const item of (itemRows ?? []) as ItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (rows as OrderRow[]).map((row) =>
    mapOrderRow(row, itemsByOrder.get(row.id) ?? [])
  );
}

/**
 * Guest order lookup via the security-definer RPCs — returns the order ONLY
 * when both the order number and the customer email match, so anyone can
 * check their own order without exposing anyone else's.
 */
export async function lookupGuestOrder(
  orderNumber: string,
  email: string
): Promise<Order | null> {
  const supabase = createClient();
  const { data: rows } = await supabase.rpc("get_order_for_customer", {
    p_order_number: orderNumber,
    p_email: email,
  });
  const row = (rows as OrderRow[] | null)?.[0];
  if (!row) return null;

  const { data: itemRows } = await supabase.rpc("get_order_items_for_customer", {
    p_order_id: row.id,
    p_email: email,
  });

  return mapOrderRow(row, (itemRows ?? []) as ItemRow[]);
}

/**
 * A single order by its order number (e.g. "SC-XXXX"), scoped to the
 * signed-in user. Defense-in-depth: even if the table's RLS policies are not
 * (yet) applied in the live project, a customer can never read another
 * customer's order by guessing an order number. Returns null for guests —
 * guest tracking happens via lookupGuestOrder (order number + email).
 */
export async function fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .limit(1);

  const row = (rows as OrderRow[] | null)?.[0];
  if (!row) return null;

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("product_id, name, size, price_kobo, qty")
    .eq("order_id", row.id);

  return mapOrderRow(row, (itemRows ?? []) as ItemRow[]);
}
