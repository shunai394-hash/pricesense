import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { getWorkspaceRuntimeStatus } from "@/lib/server/integrations";
import { listIntegrationAdapters } from "@/lib/integrations/adapters";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getWorkspaceRuntimeStatus();
  return NextResponse.json({
    ...status,
    adapters: listIntegrationAdapters().map((item) => ({
      id: item.id,
      name: item.name,
      connected: item.connected,
      statusLabel: item.statusLabel,
      detail: item.detail,
    })),
    notice:
      "未接続の外部サービスは架空データで埋めません。APIキー設定後に接続できます。",
  });
}
