import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const ADMIN_HOME = "/admin/dashboard";
const USER_HOME = "/user/dashboard";

const AUTH_COOKIE_NAME = "access_token";
const ROLE_COOKIE_NAME = "user_role";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ADMIN_VIEWER", "PROPRIETOR"];
const USER_ROLES = ["USER"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api");

  if (isStaticAsset) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const userRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  const isLoginPage = pathname === LOGIN_PATH;
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");
  const isProtectedRoute = isAdminRoute || isUserRoute;

  // 🔥 HARD BLOCK: no token → no access
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // 🔥 VALIDATE SESSION WITH BACKEND (CRITICAL)
  if (authToken) {
    try {
      const verifyRes = await fetch(
        "http://localhost:3001/auth/verify",
        {
          method: "GET",
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${authToken}`,
          },
        }
      );

      // ❌ invalid session → force logout
      if (!verifyRes.ok) {
        const res = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
        res.cookies.delete(AUTH_COOKIE_NAME);
        res.cookies.delete(ROLE_COOKIE_NAME);
        return res;
      }
    } catch {
      const res = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
      res.cookies.delete(AUTH_COOKIE_NAME);
      res.cookies.delete(ROLE_COOKIE_NAME);
      return res;
    }
  }

  // 🔥 LOGIN PAGE BLOCK
  if (isLoginPage && authToken && userRole) {
    if (ADMIN_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
    }

    if (USER_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL(USER_HOME, request.url));
    }
  }

  // 🔥 ROLE BASED HARD SECURITY
  if (authToken && userRole) {
    if (isAdminRoute && !ADMIN_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL(USER_HOME, request.url));
    }

    if (isUserRoute && !USER_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*", "/login"],
};