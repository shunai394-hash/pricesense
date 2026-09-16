import type { Metadata } from "next";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Companies",
  description: "既存Leadと手動登録から作る企業一覧（AI営業部）",
  path: "/app/companies",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesOsDirectory view="companies" />
    </main>
  );
}
