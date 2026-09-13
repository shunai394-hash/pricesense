import type { Metadata } from "next";
import { SalesOpsDashboard } from "@/components/SalesOpsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sales Ops Audit",
  description: "営業アクションの監査・失敗復旧（管理者専用）",
  path: "/admin/ops",
  noIndex: true,
});

export default function SalesOpsAdminPage() {
  return (
    <main id="main-content">
      <SalesOpsDashboard />
    </main>
  );
}
