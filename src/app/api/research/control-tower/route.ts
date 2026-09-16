import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { publicErrorMessage } from "@/lib/server/public-error";
import { loadControlTower } from "@/lib/research/tower";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tower = await loadControlTower();
    return NextResponse.json(tower);
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load control tower") },
      { status: 500 }
    );
  }
}
