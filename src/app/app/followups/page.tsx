import type { Metadata } from "next";
import { FollowupsDirectory } from "@/components/sales/FollowupsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Follow-ups",
  description: "フォローアップ管理（AI営業部）",
  path: "/app/followups",
  noIndex: true,
});

export default function AppFollowupsPage() {
  return (
    <main id="main-content">
      <FollowupsDirectory />
    </main>
  );
}
