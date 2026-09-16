import type { Metadata } from "next";
import { DiscoveriesPanel } from "@/components/research/DiscoveriesPanel";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Research",
  description: "共通Researchと確認済み事実に基づく企業リサーチ",
  path: "/app/research",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <DiscoveriesPanel />
      <SalesOsDirectory view="research" />
    </main>
  );
}
