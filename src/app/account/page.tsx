import type { Metadata } from "next";
import { AccountPageContent } from "@/components/AccountPageContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "マイページ",
  description:
    "PriceSenseの現在のプラン確認、この端末に保存した診断結果、Premiumサブスクリプションの解約手続き。",
  path: "/account",
  noIndex: true,
});

export default function AccountPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="noise-overlay fixed inset-0 z-50 opacity-40" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.02] blur-[100px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-accent/[0.02] blur-[100px]" />
      </div>

      <SiteHeader active="account" />

      <main id="main-content" className="relative z-10">
        <AccountPageContent />
      </main>

      <SiteFooter />
    </div>
  );
}
