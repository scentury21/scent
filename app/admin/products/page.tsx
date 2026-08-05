"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, ML_SIZES, slugify } from "@/lib/products";
import { mapProductRow, type Product, type ProductRow } from "@/lib/products";
import { formatNGN } from "@/lib/currency";

type Draft = {
  id: string | null;
  name: string;
  subtitle: string;
  category: string;
  family: string;
  size: string;
  price: string;
  stock: string;
  tag: "" | "Bestseller" | "New" | "Limited";
  description: string;
  palette: [string, string, string];
  top: string;
  heart: string;
  base: string;
  imageUrl: string;
  featured: boolean;
  active: boolean;
};

const EMPTY: Draft = {
  id: null,
  name: "",
  subtitle: "",
  category: "Spray Perfumes",
  family: "",
  size: "50ml",
  price: "",
  stock: "10",
  tag: "",
  description: "",
  palette: ["#d4a94a", "#b45309", "#7c2d12"],
  top: "",
  heart: "",
  base: "",
  imageUrl: "",
  featured: false,
  active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setProducts((data ?? []).map((row) => mapProductRow(row as ProductRow)));
    setLoading(false);
  }, []);

  useEffect(() => {
    // Kick off the initial fetch in a microtask so state updates are not
    // synchronous within the effect (react-hooks/set-state-in-effect).
    void Promise.resolve().then(load);
  }, [load]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const setDraft = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setEditing((d) => (d ? { ...d, [k]: v } : d));

  const openNew = () => {
    setFile(null);
    setEditing({ ...EMPTY });
  };

  const openEdit = (p: Product) => {
    setFile(null);
    setEditing({
      id: p.id,
      name: p.name,
      subtitle: p.subtitle,
      category: p.category,
      family: p.family,
      size: p.size,
      price: String(p.price),
      stock: String(p.stock),
      tag: p.tag ?? "",
      description: p.description,
      palette: [...p.palette] as [string, string, string],
      top: p.notes.top.join(", "),
      heart: p.notes.heart.join(", "),
      base: p.notes.base.join(", "),
      imageUrl: p.image ?? "",
      featured: p.featured ?? false,
      active: true,
    });
  };

  async function handleSave() {
    if (!editing) return;
    setError(null);
    if (!editing.name.trim()) {
      flash("Please give the product a name.");
      return;
    }
    const price = Number(editing.price);
    if (!price || price <= 0) {
      flash("Please enter a valid price in naira.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // 1) Upload the perfume photo (if one was chosen) to Supabase Storage.
    let imageUrl = editing.imageUrl;
    if (file) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const path = `${slugify(editing.name) || "perfume"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setSaving(false);
        setError("Photo upload failed: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const payload = {
      slug: slugify(editing.name) || "perfume",
      name: editing.name.trim(),
      subtitle: editing.subtitle.trim() || "A Scentury21 creation",
      description: editing.description.trim() || "Crafted by the Scentury21 atelier.",
      category: editing.category,
      family: editing.family.trim() || "Signature",
      size: editing.size,
      price_kobo: Math.round(price * 100),
      stock: Math.max(0, Number(editing.stock) || 0),
      tag: editing.tag || null,
      featured: editing.featured,
      image_url: imageUrl,
      palette: editing.palette,
      notes_top: split(editing.top),
      notes_heart: split(editing.heart),
      notes_base: split(editing.base),
    };

    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditing(null);
    setFile(null);
    await load();
    flash(`Saved ${payload.name}`);
  }

  async function handleDelete(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This removes it from the storefront.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      setError(error.message);
      return;
    }
    // Best-effort: remove the photo from storage too.
    if (p.image && p.image.includes("/product-images/")) {
      const path = p.image.split("/product-images/")[1];
      void supabase.storage.from("product-images").remove([path]);
    }
    await load();
    flash(`Deleted ${p.name}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-50">Products</h1>
          <p className="text-sm text-zinc-500">
            {products.length} item{products.length === 1 ? "" : "s"} · saved to Supabase
          </p>
        </div>
        <button onClick={openNew} className="btn btn-gold px-5 py-2.5 text-xs">+ Add product</button>
      </div>

      {notice && (
        <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && !editing && <div className="glass h-48 animate-pulse rounded-2xl" />}

      {/* Product form */}
      {editing && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-zinc-100">
            {editing.id ? "Edit product" : "New product"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="input-label">Name *</label>
              <input className="input" value={editing.name} onChange={(e) => setDraft("name", e.target.value)} placeholder="Amber Oud Royale" />
            </div>
            <div>
              <label className="input-label">Subtitle</label>
              <input className="input" value={editing.subtitle} onChange={(e) => setDraft("subtitle", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={editing.category} onChange={(e) => setDraft("category", e.target.value)}>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Family</label>
              <input className="input" value={editing.family} onChange={(e) => setDraft("family", e.target.value)} placeholder="Amber Oud" />
            </div>
            <div>
              <label className="input-label">Size (ml) *</label>
              <select className="input" value={editing.size} onChange={(e) => setDraft("size", e.target.value)}>
                {ML_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Price (₦) *</label>
              <input type="number" min="0" className="input" value={editing.price} onChange={(e) => setDraft("price", e.target.value)} placeholder="385000" />
            </div>
            <div>
              <label className="input-label">Stock</label>
              <input type="number" min="0" className="input" value={editing.stock} onChange={(e) => setDraft("stock", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Tag</label>
              <select className="input" value={editing.tag} onChange={(e) => setDraft("tag", e.target.value as Draft["tag"])}>
                <option value="">None</option>
                <option value="Bestseller">Bestseller</option>
                <option value="New">New</option>
                <option value="Limited">Limited</option>
              </select>
            </div>
            <div>
              <label className="input-label">Perfume photo</label>
              <input
                type="file"
                accept="image/*"
                className="input cursor-pointer file:cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {(file || editing.imageUrl) && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={file ? URL.createObjectURL(file) : editing.imageUrl}
                    alt="Preview"
                    className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                  />
                  <span className="text-[11px] text-zinc-500">
                    {file ? "New photo selected — save to upload" : "Current photo — shown on the storefront instead of the bottle art"}
                  </span>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Description</label>
              <textarea className="input min-h-20" value={editing.description} onChange={(e) => setDraft("description", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Top notes (comma separated)</label>
              <input className="input" value={editing.top} onChange={(e) => setDraft("top", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Heart notes</label>
              <input className="input" value={editing.heart} onChange={(e) => setDraft("heart", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Base notes</label>
              <input className="input" value={editing.base} onChange={(e) => setDraft("base", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Bottle palette</label>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    type="color"
                    className="h-11 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                    value={editing.palette[i]}
                    onChange={(e) => {
                      const next = [...editing.palette] as [string, string, string];
                      next[i] = e.target.value;
                      setDraft("palette", next);
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={editing.featured} onChange={(e) => setDraft("featured", e.target.checked)} className="h-4 w-4" />
                Featured
              </label>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn btn-gold px-6 py-2.5 text-xs disabled:opacity-70">
              {saving ? "Saving…" : "Save product"}
            </button>
            <button onClick={() => { setEditing(null); setFile(null); }} className="btn btn-ghost px-6 py-2.5 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && products.length === 0 && (
        <div className="glass rounded-2xl p-14 text-center">
          <div className="text-4xl">🫙</div>
          <p className="mt-3 text-zinc-400">No products yet. Add your first perfume above.</p>
        </div>
      )}
      {products.length > 0 && (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/product/${p.id}`} className="group flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span
                          className="h-9 w-9 shrink-0 rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${p.palette[0]}, ${p.palette[2]})` }}
                        />
                      )}
                      <div>
                        <div className="font-medium text-zinc-100 group-hover:text-gold-200">{p.name}</div>
                        <div className="text-[11px] text-zinc-500">{p.family}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{p.category}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.size}</td>
                  <td className="px-4 py-3 text-zinc-200">{formatNGN(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stock <= 8 ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p.tag ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-gold-400/40 hover:text-gold-200">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-400/40 hover:text-red-300">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
