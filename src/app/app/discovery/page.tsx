import type { Metadata } from "next";
import { DiscoveryOsPanel } from "@/components/sales/DiscoveryOsPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "新規開拓",
  description: "AIが未接触企業を発見し、Factと仮説を分けて営業準備まで行う。",
  path: "/app/discovery",
  noIndex: true,
});

export default function DiscoveryPage() {
  return (
    <main id="main-content">
      <DiscoveryOsPanel />
    </main>
  );
}
