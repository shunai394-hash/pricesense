import type { Metadata } from "next";
import { RevopsDashboard } from "@/components/RevopsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "RevOps",
  description: "AI営業部のファネル・成約・失注分析（管理者専用）",
  path: "/admin/revops",
  noIndex: true,
});

export default function RevopsAdminPage() {
  return (
    <main id="main-content">
      <RevopsDashboard />
    </main>
  );
}
