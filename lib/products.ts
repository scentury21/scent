import type { Product } from "./types";

export type { Product };

/**
 * Storefront categories. Perfumes are either oil-based or spray-based.
 * "All" is the virtual "no filter" option used by the shop.
 */
export const CATEGORIES = ["All", "Oil Perfumes", "Spray Perfumes"] as const;

/** Bottle sizes (ml) an admin can pick when adding a perfume. */
export const ML_SIZES = ["10ml", "20ml", "30ml", "50ml", "100ml", "150ml", "200ml"] as const;

/** Raw row shape from public.products. */
export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  family: string;
  size: string;
  price_kobo: number;
  stock: number;
  rating: number;
  reviews_count: number;
  tag: "Bestseller" | "New" | "Limited" | null;
  featured: boolean | null;
  image_url: string | null;
  palette: string[];
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
};

/** Convert a database product row into the storefront Product shape. */
export function mapProductRow(row: ProductRow): Product {
  const palette: [string, string, string] = [
    row.palette?.[0] ?? "#d4a94a",
    row.palette?.[1] ?? "#b45309",
    row.palette?.[2] ?? "#7c2d12",
  ];
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle || "A Scentury21 creation",
    category: row.category || "Spray Perfumes",
    family: row.family || "Signature",
    size: row.size || "100ml",
    price: Math.round((Number(row.price_kobo) || 0) / 100),
    stock: row.stock ?? 0,
    rating: Number(row.rating) || 0,
    reviewsCount: row.reviews_count ?? 0,
    reviews: [],
    notes: {
      top: row.notes_top ?? [],
      heart: row.notes_heart ?? [],
      base: row.notes_base ?? [],
    },
    description: row.description || "Crafted by the Scentury21 atelier.",
    palette,
    tag: row.tag ?? undefined,
    featured: row.featured ?? false,
    image: row.image_url || undefined,
  };
}

/** Client-side slug generator used by the admin form. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
