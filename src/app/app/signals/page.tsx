import type { Metadata } from "next";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Intent Signals",
  description: "Leadスコアと確認済みIntent Signal（AI営業部）",
  path: "/app/signals",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesOsDirectory view="signals" />
    </main>
  );
}
