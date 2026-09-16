import type { Metadata } from "next";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Outreach",
  description: "営業メール下書き。外部送信は人間承認後のみ（AI営業部）",
  path: "/app/outreach",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesOsDirectory view="outreach" />
    </main>
  );
}
