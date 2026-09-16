import type { Metadata } from "next";
import { ProposalsDirectory } from "@/components/sales/ProposalsDirectory";
import { QuotesDirectory } from "@/components/sales/QuotesDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Proposals / Quotes",
  description: "AIで作成した提案書・見積書を管理します。",
  path: "/app/proposals",
  noIndex: true,
});

export default function AppProposalsPage() {
  return (
    <main id="main-content">
      <ProposalsDirectory />
      <QuotesDirectory />
    </main>
  );
}