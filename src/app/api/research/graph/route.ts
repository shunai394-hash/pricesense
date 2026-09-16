import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { loadKnowledgeGraph } from "@/lib/research/tower";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const graph = await loadKnowledgeGraph();
    return NextResponse.json({
      ...graph,
      emptyReason: graph.empty
        ? "Knowledge Graphはまだ空です。特派員が確認済みソースを取り込むと、企業・ブランド・商品・場所の関係がここに蓄積されます。"
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load knowledge graph") },
      { status: 500 }
    );
  }
}
