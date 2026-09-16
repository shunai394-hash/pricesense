import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import {
  markDiscoveryForNewfind,
  promoteDiscoveryToPriceSense,
} from "@/lib/research/promote";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.discovery_id !== "string" || !UUID_RE.test(body.discovery_id)) {
    return NextResponse.json({ error: "discovery_id is required" }, { status: 400 });
  }

  const consumer = body.consumer === "newfind" ? "newfind" : "pricesense";

  try {
    if (consumer === "newfind") {
      const result = await markDiscoveryForNewfind(body.discovery_id);
      return NextResponse.json({
        ok: true,
        ...result,
        autoEmail: false,
        notice: "NEWFINDは未接続です。共通Research層の受け取り口だけ用意しました。",
      });
    }

    const result = await promoteDiscoveryToPriceSense(body.discovery_id);
    return NextResponse.json({
      ok: true,
      consumer: "pricesense",
      autoEmail: false,
      notice: "Prospect / Intent / Research まで作成しました。営業メールは送信していません。",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to promote discovery") },
      { status: 400 }
    );
  }
}
