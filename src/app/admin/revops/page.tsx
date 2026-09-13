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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>
      <main id="main-content" className="relative z-10">
        <RevopsDashboard />
      </main>
    </div>
  );
}
