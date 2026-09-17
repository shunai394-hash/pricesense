import type { Metadata } from "next";
import { OfferingsPanel } from "@/components/sales/OfferingsPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Offering / ICP",
  description: "AI新規開拓の探索基準。何を売るかとIdeal Customer Profileを設定します。",
  path: "/app/offerings",
  noIndex: true,
});

export default function OfferingsPage() {
  return (
    <main id="main-content">
      <OfferingsPanel />
    </main>
  );
}
