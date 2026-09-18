import { NextResponse } from "next/server";
import { createWorldEvent } from "@/lib/world/events";
import { runWorldSimulation } from "@/lib/world/world-engine";

function isAuthorized(request: Request) {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const eventId =
      typeof body.eventId === "string" && body.eventId.trim()
        ? body.eventId.trim()
        : null;

    const rounds =
      Number.isInteger(body.rounds) && body.rounds >= 1 && body.rounds <= 3
        ? body.rounds
        : 2;

    let targetEventId = eventId;

    if (!targetEventId) {
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : "AI World E2E Test Event";

      const fact =
        typeof body.fact === "string" && body.fact.trim()
          ? body.fact.trim()
          : "これはPriceSense AI WorldのE2Eテスト用イベントです。";

      const event = await createWorldEvent({
        title,
        fact,
        hypothesis:
          typeof body.hypothesis === "string" && body.hypothesis.trim()
            ? body.hypothesis.trim()
            : null,
        sourceUrl:
          typeof body.sourceUrl === "string" && body.sourceUrl.trim()
            ? body.sourceUrl.trim()
            : null,
        eventType:
          typeof body.eventType === "string" && body.eventType.trim()
            ? body.eventType.trim()
            : "e2e_test",
        importance:
          body.importance === "low" ||
          body.importance === "medium" ||
          body.importance === "high" ||
          body.importance === "critical"
            ? body.importance
            : "medium",
        metadata: {
          createdBy: "api/world/run",
          e2e: true,
        },
      });

      targetEventId = event.id;
    }

    const result = await runWorldSimulation(targetEventId, rounds);

    return NextResponse.json({
      ok: true,
      eventId: targetEventId,
      rounds,
      result,
    });
  } catch (error) {
    console.error("[world/run] failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
