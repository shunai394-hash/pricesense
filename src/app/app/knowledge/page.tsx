import type { Metadata } from "next";
import { KnowledgeGraphPanel } from "@/components/research/KnowledgeGraphPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Knowledge Graph",
  description: "共通Research基盤の関係グラフ",
  path: "/app/knowledge",
  noIndex: true,
});

export default function KnowledgePage() {
  return (
    <main id="main-content">
      <KnowledgeGraphPanel />
    </main>
  );
}
