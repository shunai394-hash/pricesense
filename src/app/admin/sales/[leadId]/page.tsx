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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/[0.03] blur-[120px]" />
      </div>
      <main id="main-content" className="relative z-10">
        <SalesLeadWorkspace leadId={leadId} />
      </main>
    </div>
  );
}
