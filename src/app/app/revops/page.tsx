import type { Metadata } from "next";
import { RevopsDashboard } from "@/components/RevopsDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "RevOps",
  description: "実データに基づく売上・ファネル分析（AI営業部）",
  path: "/app/revops",
  noIndex: true,
});

export default function AppRevopsPage() {
  return (
    <main id="main-content">
      <RevopsDashboard />
    </main>
  );
}
