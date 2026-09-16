import type { Metadata } from "next";
import { SalesActionsDashboard } from "@/components/SalesActionsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sales Actions",
  description: "AIが次に実行すべき営業アクションを整理します。",
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