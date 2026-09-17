import { NextResponse } from "next/server";
import { isOpsRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { runNewBusinessCycle } from "@/lib/nbos/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isOpsRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runNewBusinessCycle();
    return NextResponse.json({ ok: true, autoEmail: false, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to run new business cron") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
