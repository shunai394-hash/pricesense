import type { Metadata } from "next";
import { CorrespondentsPanel } from "@/components/research/CorrespondentsPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI特派員",
  description: "世界AI特派員ネットワーク",
  path: "/app/correspondents",
  noIndex: true,
});

export default function CorrespondentsPage() {
  return (
    <main id="main-content">
      <CorrespondentsPanel />
    </main>
  );
}
