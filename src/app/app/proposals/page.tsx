import type { Metadata } from "next";
import { ProposalsDirectory } from "@/components/sales/ProposalsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Proposals",
  description: "提案Draft一覧（AI営業部）",
  path: "/app/proposals",
  noIndex: true,
});

export default function AppProposalsPage() {
  return (
    <main id="main-content">
      <ProposalsDirectory />
    </main>
  );
}
