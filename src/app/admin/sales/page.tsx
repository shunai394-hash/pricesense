import type { Metadata } from "next";
import { SalesActionsDashboard } from "@/components/SalesActionsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sales Actions",
  description: "今日やるべき営業アクション（管理者専用）",
  path: "/admin/sales",
  noIndex: true,
});

export default function SalesAdminPage() {
  return (
    <main id="main-content">
      <SalesActionsDashboard />
    </main>
  );
}
