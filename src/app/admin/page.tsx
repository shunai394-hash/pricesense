import type { Metadata } from "next";
import { SalesWorkspaceHome } from "@/components/SalesWorkspaceHome";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "営業ワークスペース",
  description: "今日の営業状況（管理者専用）",
  path: "/admin",
  noIndex: true,
});

export default function AdminHomePage() {
  return (
    <main id="main-content">
      <SalesWorkspaceHome />
    </main>
  );
}
