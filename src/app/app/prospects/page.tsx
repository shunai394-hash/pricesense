import type { Metadata } from "next";
import { ProspectsDirectory } from "@/components/sales/ProspectsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Prospects",
  description: "企業開拓と営業優先順位を管理します。",
  path: "/app/prospects",
  noIndex: true,
});

export default function ProspectsPage() {
  return (
    <main id="main-content">
      <ProspectsDirectory />
    </main>
  );
}
