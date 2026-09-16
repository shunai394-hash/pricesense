import type { Metadata } from "next";
import { NegotiationWorkspace } from "@/components/sales/NegotiationWorkspace";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "交渉支援",
  description: "価格・稟議・競合などの交渉を事実と不明点に分けて整理します。",
  path: "/app/negotiation",
  noIndex: true,
});

export default function NegotiationPage() {
  return (
    <main id="main-content">
      <NegotiationWorkspace />
    </main>
  );
}
