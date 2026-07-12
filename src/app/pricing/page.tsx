import type { Metadata } from "next";
import { PricingPageContent } from "@/components/PricingPageContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createPageMetadata } from "@/lib/seo";
import { PREMIUM_MONTHLY_PRICE } from "@/lib/pricing";

export const metadata: Metadata = createPageMetadata({
  title: "料金プラン",
  description: `PriceSenseの料金プラン。無料診断からPremium（月額${PREMIUM_MONTHLY_PRICE.toLocaleString("ja-JP")}円）まで、フリーランスの単価改善をサポートします。`,
  path: "/pricing",
});
export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <SiteHeader active="pricing" />

      <main id="main-content" className="relative z-10">
        <PricingPageContent />
      </main>

      <SiteFooter />
    </div>
  );
}
