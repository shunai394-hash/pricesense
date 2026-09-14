import type { Metadata } from "next";
import { SalesWorkspaceHome } from "@/components/SalesWorkspaceHome";
import { SalesAppShell } from "@/components/sales/SalesAppShell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI営業部",
  description:
    "今日やるべき営業アクションと営業状況を確認します。AIは提案し、契約・価格・外部連絡は人間が確認します。",
  path: "/",
});

export default function Home() {
  return (
    <SalesAppShell>
      <main id="main-content">
        <SalesWorkspaceHome />
      </main>
    </SalesAppShell>
  );
}
