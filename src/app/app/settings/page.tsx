import type { Metadata } from "next";
import { SettingsPanel } from "@/components/sales/SettingsPanel";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Settings",
  description: "アカウント・AI方針・セキュリティ（AI営業部）",
  path: "/app/settings",
  noIndex: true,
});

export default function AppSettingsPage() {
  return (
    <main id="main-content">
      <SettingsPanel />
    </main>
  );
}
