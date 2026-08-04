"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "🫙" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass h-fit rounded-2xl p-4 lg:sticky lg:top-24">
      <div className="px-2 pb-3 pt-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Scentury21</div>
        <div className="font-display text-lg font-semibold text-zinc-100">Admin studio</div>
      </div>
      <nav className="space-y-1">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gradient-to-r from-gold-400/15 to-transparent text-gold-200 border border-gold-400/20"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100 border border-transparent"
              }`}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100">
          <span>🏬</span>
          View storefront
        </Link>
      </div>
    </aside>
  );
}
