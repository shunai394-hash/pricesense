import type { Metadata } from "next";
import { ControlTowerPanel } from "@/components/research/ControlTowerPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI Control Tower",
  description: "世界AI特派員の稼働状況",
  path: "/app/control-tower",
  noIndex: true,
});

export default function ControlTowerPage() {
  return (
    <main id="main-content">
      <ControlTowerPanel />
    </main>
  );
}
