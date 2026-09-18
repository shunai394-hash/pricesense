import { NextResponse } from "next/server";
import { evaluateWorldForecast } from "@/lib/world/forecasts";

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

    const forecastId =
      typeof body.forecastId === "string" && body.forecastId.trim()
        ? body.forecastId.trim()
        : null;

    const actualOutcome =
      typeof body.actualOutcome === "string" && body.actualOutcome.trim()
        ? body.actualOutcome.trim()
        : null;

    const accuracy =
      body.accuracy === "correct" ||
      body.accuracy === "partially_correct" ||
      body.accuracy === "incorrect"
        ? body.accuracy
        : null;

    if (!forecastId) {
      return NextResponse.json(
        { ok: false, error: "forecastId is required" },
        { status: 400 }
      );
    }

    if (!actualOutcome) {
      return NextResponse.json(
        { ok: false, error: "actualOutcome is required" },
        { status: 400 }
      );
    }

    if (!accuracy) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'accuracy must be "correct", "partially_correct", or "incorrect"',
        },
        { status: 400 }
      );
    }

    const forecast = await evaluateWorldForecast(
      forecastId,
      actualOutcome,
      accuracy
    );

    return NextResponse.json({
      ok: true,
      forecast,
    });
  } catch (error) {
    console.error("[world/evaluate] failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
