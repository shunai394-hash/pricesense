import type { Metadata } from "next";
import { SalesOsDirectory } from "@/components/sales/SalesOsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Inbox",
  description: "返信解析とAI返信案。引き継ぎは人間が承認（AI営業部）",
  path: "/app/inbox",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesOsDirectory view="inbox" />
    </main>
  );
}
