import type { Metadata } from "next";
import { SalesLeadWorkspace } from "@/components/SalesLeadWorkspace";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sales Action Detail",
  description: "営業アクションの詳細（管理者専用）",
  path: "/admin/sales",
  noIndex: true,
});

export default async function SalesLeadAdminPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  return (
    <main id="main-content">
      <SalesLeadWorkspace leadId={leadId} />
    </main>
  );
}
