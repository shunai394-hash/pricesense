import { NextResponse } from "next/server";
import { getWorldPosts } from "@/lib/world/posts";

function isAuthorized(request: Request) {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  return token === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId")?.trim();

    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "eventId is required" },
        { status: 400 }
      );
    }

    const posts = await getWorldPosts(eventId, 100);

    return NextResponse.json({
      ok: true,
      eventId,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("[world/posts] failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
