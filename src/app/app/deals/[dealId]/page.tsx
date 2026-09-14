import type { Metadata } from "next";
import { SalesDealWorkspace } from "@/components/sales/SalesDealWorkspace";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Deal詳細",
  description: "Dealの確認と人間による確定操作（AI営業部）",
  path: "/app/deals",
  noIndex: true,
});

export default async function AppDealPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  return (
    <main id="main-content">
      <SalesDealWorkspace dealId={dealId} />
    </main>
  );
}
