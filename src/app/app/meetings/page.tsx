import type { Metadata } from "next";
import { MeetingsDirectory } from "@/components/sales/MeetingsDirectory";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Meetings",
  description: "商談一覧（AI営業部）",
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
