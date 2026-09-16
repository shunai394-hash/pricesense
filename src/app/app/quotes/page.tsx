import type { Metadata } from "next";
import { QuotesDirectory } from "@/components/sales/QuotesDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Quotes",
  description: "見積書を管理します。",
  path: "/app/quotes",
  noIndex: true,
});

export default function QuotesPage() {
  return (
    <main id="main-content">
      <QuotesDirectory />
    </main>
  );
}
