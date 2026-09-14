import type { Metadata } from "next";
import { SalesActionsDashboard } from "@/components/SalesActionsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "営業",
  description: "今日やるべき営業アクション（AI営業部）",
  path: "/app/sales",
  noIndex: true,
});

export default function AppSalesPage() {
  return (
    <main id="main-content">
      <SalesActionsDashboard />
    </main>
  );
}
