import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/app";
}

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function otpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  return OTP_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = otpType(requestUrl.searchParams.get("type"));
  const next = safeNext(requestUrl.searchParams.get("next"));
  const authError = requestUrl.searchParams.get("error");

  if (authError) {
    const login = new URL("/login", requestUrl.origin);
    login.searchParams.set("error", authError === "access_denied" ? "oauth" : "email");
    return NextResponse.redirect(login);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=config", requestUrl.origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback]", error.message);
      const failed = new URL("/login", requestUrl.origin);
      failed.searchParams.set("error", type === "recovery" ? "email" : "oauth");
      return NextResponse.redirect(failed);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error("[auth/callback verify]", error.message);
      return NextResponse.redirect(new URL("/login?error=verify", requestUrl.origin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  const destination =
    type === "recovery" || next === "/reset-password" ? "/reset-password" : next;
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
