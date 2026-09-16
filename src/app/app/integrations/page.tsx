import type { Metadata } from "next";
import { IntegrationsPanel } from "@/components/sales/IntegrationsPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "外部サービス連携",
  description: "Apollo / Clay / Instantly / Sales Marker / Sansan の接続状態",
  path: "/app/integrations",
  noIndex: true,
});

export default function IntegrationsPage() {
  return (
    <main id="main-content">
      <IntegrationsPanel />
    </main>
  );
}
