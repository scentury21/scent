"use client";

import { useState } from "react";
import Link from "next/link";
import { getProducts, saveProduct, deleteProduct } from "@/lib/store";
import { CATEGORIES } from "@/lib/products";
import { formatNGN } from "@/lib/currency";
import type { Product } from "@/lib/types";

type Draft = {
  id: string;
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
};

const EMPTY: Draft = {
  id: "",
  name: "",
  subtitle: "",
  category: "Eau de Parfum",
  family: "",
  size: "100ml",
  price: "",
  stock: "10",
  tag: "",
  description: "",
  palette: ["#d4a94a", "#b45309", "#7c2d12"],
  top: "",
  heart: "",
  base: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [editing, setEditing] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => setProducts(getProducts());

  const openNew = () => setEditing({ ...EMPTY, id: slugify(`new-${Date.now()}`) });

  const openEdit = (p: Product) =>
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
    });

  const handleDelete = (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This removes it from the storefront.`)) return;
    deleteProduct(p.id);
    refresh();
    flash(`Deleted ${p.name}`);
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      flash("Please give the product a name.");
      return;
    }
    const price = Number(editing.price);
    if (!price || price <= 0) {
      flash("Please enter a valid price in naira.");
      return;
    }
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const product: Product = {
      id: editing.id || slugify(editing.name),
      name: editing.name.trim(),
      subtitle: editing.subtitle.trim() || "A Scentury21 creation",
      category: editing.category,
      family: editing.family.trim() || "Signature",
      size: editing.size.trim() || "100ml",
      price,
      stock: Math.max(0, Number(editing.stock) || 0),
      rating: 4.5,
      reviewsCount: 0,
      reviews: [],
      notes: {
        top: split(editing.top).length ? split(editing.top) : ["Bergamot"],
        heart: split(editing.heart).length ? split(editing.heart) : ["Jasmine"],
        base: split(editing.base).length ? split(editing.base) : ["Musk"],
      },
      description: editing.description.trim() || "Crafted by the Scentury21 atelier.",
      palette: editing.palette,
      tag: editing.tag || undefined,
    };
    saveProduct(product);
    setEditing(null);
    refresh();
    flash(`Saved ${product.name}`);
  };

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const setDraft = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setEditing((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-50">Products</h1>
          <p className="text-sm text-zinc-500">
            {products.length} items · edits persist in this browser (demo)
          </p>
        </div>
        <button onClick={openNew} className="btn btn-gold px-5 py-2.5 text-xs">+ Add product</button>
      </div>

      {notice && (
        <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-200">
          {notice}
        </div>
      )}

      {/* Product form */}
      {editing && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-zinc-100">
            {products.some((p) => p.id === editing.id) ? "Edit product" : "New product"}
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
              <label className="input-label">Size</label>
              <input className="input" value={editing.size} onChange={(e) => setDraft("size", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Price (₦) *</label>
              <input className="input" type="number" value={editing.price} onChange={(e) => setDraft("price", e.target.value)} />
            </div>
            <div>
              <label className="input-label">Stock</label>
              <input className="input" type="number" value={editing.stock} onChange={(e) => setDraft("stock", e.target.value)} />
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
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} className="btn btn-gold px-6 py-2.5 text-xs">Save product</button>
            <button onClick={() => setEditing(null)} className="btn btn-ghost px-6 py-2.5 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
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
                  <Link href={`/product/${p.id}`} className="flex items-center gap-3 group">
                    <span
                      className="h-9 w-9 shrink-0 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${p.palette[0]}, ${p.palette[2]})` }}
                    />
                    <div>
                      <div className="font-medium text-zinc-100 group-hover:text-gold-200">{p.name}</div>
                      <div className="text-[11px] text-zinc-500">{p.size}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.category}</td>
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
    </div>
  );
}
