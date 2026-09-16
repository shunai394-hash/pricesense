import type { Metadata } from "next";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Research",
  description: "確認済み事実に基づくAI企業リサーチ（AI営業部）",
  path: "/app/research",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesOsDirectory view="research" />
    </main>
  );
}
