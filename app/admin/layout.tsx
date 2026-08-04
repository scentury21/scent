import type { Metadata } from "next";
import AdminGate from "@/components/admin-gate";
import AdminSidebar from "@/components/admin-sidebar";

export const metadata: Metadata = {
  title: "Admin",
  description: "Scentury21 admin dashboard — products, orders, customers and analytics.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AdminGate>
  );
}
