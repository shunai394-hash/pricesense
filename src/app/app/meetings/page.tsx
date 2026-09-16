import type { Metadata } from "next";
import { MeetingsDirectory } from "@/components/sales/MeetingsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Meetings",
  description: "営業ミーティングと次のアクションを管理します。",
  path: "/app/meetings",
  noIndex: true,
});

export default function AppMeetingsPage() {
  return (
    <main id="main-content">
      <MeetingsDirectory />
    </main>
  );
}