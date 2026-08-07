import { notFound } from "next/navigation";

// Server-rendered report views used by the Telegram bot's screenshot_page
// tool (screenshotted via the free Microlink API). Gated by REPORT_KEY so
// only the bot can reach them. Same data as the admin panel, styled as a
// clean printable page.

export const dynamic = "force-dynamic";

const SECTION_TITLES: Record<string, string> = {
  orders: "Orders",
  products: "Products",
  customers: "Customers",
  stats: "Stats",
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchRows(path: string): Promise<Record<string, unknown>[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Record<string, unknown>[];
}

const ngn = (kobo: unknown): string =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(kobo ?? 0) / 100);

const date = (iso: unknown): string => {
  try {
    return new Date(String(iso)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso ?? "");
  }
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#06b6d4",
  shipped: "#3b82f6",
  delivered: "#10b981",
  cancelled: "#ef4444",
  paid: "#10b981",
  failed: "#ef4444",
  refunded: "#a855f7",
};

const STYLE = `
  .report { background: #121110; color: #f5efe2; font-family: Georgia, 'Times New Roman', serif; padding: 30px 34px; min-height: 92vh; }
  .report .head { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 2px solid #c9a24b; padding-bottom: 12px; margin-bottom: 20px; }
  .report .head h1 { font-size: 26px; letter-spacing: 1px; color: #e5b25d; margin: 0; }
  .report .stamp { font-size: 12px; color: #8b8372; }
  .report table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .report th { text-align: left; text-transform: uppercase; letter-spacing: 0.6px; font-size: 10px; color: #c9a24b; padding: 8px 10px; border-bottom: 1px solid #3a352c; }
  .report td { padding: 9px 10px; border-bottom: 1px solid #26231d; color: #efe8d8; }
  .report tr:hover td { background: #1b1915; }
  .report .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; border: 1px solid; }
  .report .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
  .report .card { background: #1b1915; border: 1px solid #2e2a22; border-radius: 12px; padding: 16px; }
  .report .card .k { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #8b8372; }
  .report .card .v { font-size: 22px; color: #e5b25d; margin-top: 6px; }
  .report .muted { color: #8b8372; }
  .report .ok { color: #10b981; }
  .report .warn { color: #f59e0b; }
  .report h2 { margin: 18px 0 10px; font-size: 15px; }
  .report .foot { margin-top: 18px; text-align: right; font-size: 11px; color: #6b6455; }
`;

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="report">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="head">
        <h1>SCENTURY21 — {title}</h1>
        <div className="stamp">Live store report · {date(new Date().toISOString())}</div>
      </div>
      {children}
      <div className="foot">scentury21 · generated {new Date().toLocaleString("en-GB")}</div>
    </div>
  );
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ section }, { key }] = await Promise.all([params, searchParams]);
  if (!process.env.REPORT_KEY || key !== process.env.REPORT_KEY) notFound();
  const sec = section.toLowerCase();
  if (!SECTION_TITLES[sec]) notFound();
  const title = SECTION_TITLES[sec];

  if (sec === "orders") {
    const orders = await fetchRows(
      "/rest/v1/orders?select=order_number,created_at,customer_name,customer_email,customer_phone,status,payment_status,total_kobo,delivery_city,delivery_country&order=created_at.desc&limit=50"
    );
    return (
      <Shell title={title}>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>City</th>
              <th>Status</th>
              <th>Payment</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i}>
                <td>{esc(o.order_number)}</td>
                <td className="muted">{date(o.created_at)}</td>
                <td>
                  {esc(o.customer_name)}
                  <div className="muted" style={{ fontSize: 11 }}>{esc(o.customer_email)}</div>
                </td>
                <td>{esc(o.delivery_city)}, {esc(o.delivery_country)}</td>
                <td>
                  <span
                    className="badge"
                    style={{ borderColor: STATUS_COLOR[String(o.status)] ?? "#666", color: STATUS_COLOR[String(o.status)] ?? "#ccc" }}
                  >
                    {esc(o.status)}
                  </span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{ borderColor: STATUS_COLOR[String(o.payment_status)] ?? "#666", color: STATUS_COLOR[String(o.payment_status)] ?? "#ccc" }}
                  >
                    {esc(o.payment_status)}
                  </span>
                </td>
                <td style={{ textAlign: "right", color: "#e5b25d" }}>{ngn(o.total_kobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="muted">No orders yet.</p>}
      </Shell>
    );
  }

  if (sec === "products") {
    const products = await fetchRows(
      "/rest/v1/products?select=name,category,size,price_kobo,stock,tag,featured&active=eq.true&order=created_at.desc&limit=100"
    );
    return (
      <Shell title={title}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Size</th>
              <th>Tag</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td>
                  {esc(p.name)}
                  {p.featured === true && <span className="muted" style={{ fontSize: 11 }}> · ★</span>}
                </td>
                <td className="muted">{esc(p.category)}</td>
                <td>{esc(p.size)}</td>
                <td>{esc(p.tag) || <span className="muted">—</span>}</td>
                <td style={{ textAlign: "right", color: "#e5b25d" }}>{ngn(p.price_kobo)}</td>
                <td style={{ textAlign: "right" }} className={Number(p.stock) <= 5 ? "warn" : "ok"}>
                  {esc(p.stock)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && <p className="muted">No products yet.</p>}
      </Shell>
    );
  }

  if (sec === "customers") {
    const orders = await fetchRows(
      "/rest/v1/orders?select=customer_name,customer_email,customer_phone,total_kobo&order=created_at.desc&limit=1000"
    );
    const byEmail = new Map<string, { name: string; phone: string; count: number; total: number }>();
    for (const o of orders) {
      const email = String(o.customer_email ?? "").toLowerCase();
      if (!email) continue;
      const cur = byEmail.get(email) ?? {
        name: String(o.customer_name ?? ""),
        phone: String(o.customer_phone ?? ""),
        count: 0,
        total: 0,
      };
      cur.count += 1;
      cur.total += Number(o.total_kobo ?? 0);
      if (!cur.name) cur.name = String(o.customer_name ?? "");
      byEmail.set(email, cur);
    }
    const rows = [...byEmail.entries()]
      .map(([email, v]) => ({ email, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);
    return (
      <Shell title={title}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Phone</th>
              <th style={{ textAlign: "right" }}>Orders</th>
              <th style={{ textAlign: "right" }}>Total spent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                <td>{esc(c.name) || <span className="muted">—</span>}</td>
                <td>{esc(c.email)}</td>
                <td>{esc(c.phone) || <span className="muted">—</span>}</td>
                <td style={{ textAlign: "right" }}>{c.count}</td>
                <td style={{ textAlign: "right", color: "#e5b25d" }}>{ngn(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="muted">No customers yet.</p>}
      </Shell>
    );
  }

  // stats
  const [orders, products, items] = await Promise.all([
    fetchRows("/rest/v1/orders?select=status,total_kobo,created_at&order=created_at.desc&limit=1000"),
    fetchRows("/rest/v1/products?select=name,stock&active=eq.true&limit=500"),
    fetchRows("/rest/v1/order_items?select=name,qty&limit=3000"),
  ]);
  const revenue = orders.reduce((s, o) => s + Number(o.total_kobo ?? 0), 0);
  const pending = orders.filter((o) => String(o.status) === "pending").length;
  const today = new Date().toDateString();
  const todayRev = orders
    .filter((o) => new Date(String(o.created_at)).toDateString() === today)
    .reduce((s, o) => s + Number(o.total_kobo ?? 0), 0);
  const lowStock = products.filter((p) => Number(p.stock) <= 5);
  const byName = new Map<string, number>();
  for (const it of items) byName.set(String(it.name), (byName.get(String(it.name)) ?? 0) + Number(it.qty ?? 1));
  const best = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <Shell title={title}>
      <div className="cards">
        <div className="card"><div className="k">Total revenue</div><div className="v">{ngn(revenue)}</div></div>
        <div className="card"><div className="k">Orders</div><div className="v">{orders.length}</div></div>
        <div className="card"><div className="k">Pending now</div><div className="v warn">{pending}</div></div>
        <div className="card"><div className="k">Low stock (≤5)</div><div className="v">{lowStock.length}</div></div>
      </div>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="k">Revenue today</div>
        <div className="v">{ngn(todayRev)}</div>
      </div>
      <h2 style={{ color: "#c9a24b" }}>Best sellers</h2>
      <table>
        <thead><tr><th>Product</th><th style={{ textAlign: "right" }}>Units sold</th></tr></thead>
        <tbody>
          {best.map(([name, qty], i) => (
            <tr key={i}><td>{esc(name)}</td><td style={{ textAlign: "right" }}>{qty}</td></tr>
          ))}
        </tbody>
      </table>
      {lowStock.length > 0 && (
        <>
          <h2 style={{ color: "#f59e0b" }}>Low stock alerts</h2>
          <p>{lowStock.slice(0, 10).map((p) => `${esc(p.name)} (${esc(p.stock)})`).join(" · ")}</p>
        </>
      )}
    </Shell>
  );
}
