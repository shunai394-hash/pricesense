import type { Metadata } from "next";
import { SalesLeadWorkspace } from "@/components/SalesLeadWorkspace";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Lead詳細",
  description: "Leadの会話・提案・Deal（AI営業部）",
  path: "/app/leads",
  noIndex: true,
});

export default async function AppLeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  return (
    <main id="main-content">
      <SalesLeadWorkspace
        leadId={leadId}
        backHref="/app/leads"
        backLabel="Lead一覧"
        eyebrow="AI営業部"
        title="Lead詳細"
      />
    </main>
  );
}
