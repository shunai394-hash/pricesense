import type { Metadata } from "next";
import { DealsDirectory } from "@/components/sales/DealsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Deals",
  description: "商談と受注までの進捗を管理します。",
  path: "/app/deals",
  noIndex: true,
});

export default function AppDealsPage() {
  return (
    <main id="main-content">
      <DealsDirectory />
    </main>
  );
}