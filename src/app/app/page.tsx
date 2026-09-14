import type { Metadata } from "next";
import { SalesWorkspaceHome } from "@/components/SalesWorkspaceHome";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI営業部",
  description: "今日やるべき営業アクションと営業状況を確認します。",
  path: "/app",
  noIndex: true,
});

export default function AppPage() {
  return (
    <main id="main-content">
      <SalesWorkspaceHome />
    </main>
  );
}
