import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadsDirectory } from "@/components/sales/LeadsDirectory";
import { LoadingState } from "@/components/ui/primitives";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Leads",
  description: "Lead一覧（AI営業部）",
  path: "/app/leads",
  noIndex: true,
});

export default function AppLeadsPage() {
  return (
    <main id="main-content">
      <Suspense fallback={<LoadingState label="Lead一覧を準備中…" />}>
        <LeadsDirectory />
      </Suspense>
    </main>
  );
}
