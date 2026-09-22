import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/app", "/admin"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedPath(pathname)) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set("error", "config");
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAuthPage(pathname) && user) {
    const app = request.nextUrl.clone();
    app.pathname = "/app";
    app.search = "";
    return NextResponse.redirect(app);
  }

  return response;
}

export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
