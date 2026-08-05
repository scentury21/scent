import { createClient } from "@/lib/supabase/server";
import { mapProductRow, type Product, type ProductRow } from "./products";

/** All active products from the database, most-featured first. */
export async function getActiveProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });
    return (data ?? []).map((row) => mapProductRow(row as ProductRow));
  } catch {
    return [];
  }
}

/** Fetch a single product by its uuid id or its slug. */
export async function getDbProduct(idOrSlug: string): Promise<Product | null> {
  try {
    const supabase = await createClient();
    const byId = await supabase
      .from("products")
      .select("*")
      .eq("id", idOrSlug)
      .maybeSingle();
    if (byId.data) return mapProductRow(byId.data as ProductRow);
    const bySlug = await supabase
      .from("products")
      .select("*")
      .eq("slug", idOrSlug)
      .maybeSingle();
    if (bySlug.data) return mapProductRow(bySlug.data as ProductRow);
    return null;
  } catch {
    return null;
  }
}
