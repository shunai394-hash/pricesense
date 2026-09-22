import { NextResponse } from "next/server";
import { isOpsRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { runDueCorrespondents } from "@/lib/research/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs whichever research correspondents are due on their own cadence
// (research_correspondents.cadence_minutes), independent of the heavier
// daily NBOS cycle -- the NBOS cron only advances 2 correspondents per run,
// which is too slow for correspondents configured with a shorter cadence.
export async function GET(request: Request) {
  if (!isOpsRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDueCorrespondents(6);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to run research cron") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
