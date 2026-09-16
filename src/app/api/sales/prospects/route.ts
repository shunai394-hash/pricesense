import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { loadSalesOsProspects } from "@/lib/server/sales-workspace";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const prospects = await loadSalesOsProspects();

    return NextResponse.json({
      prospects,
      count: prospects.length,
    });
  } catch (error) {
    console.error("[sales/prospects]", error);

    return NextResponse.json(
      { error: "Failed to load prospects" },
      { status: 500 }
    );
  }
}
