import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase-auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", origin));
}

export async function POST(request: Request) {
  return GET(request);
}
