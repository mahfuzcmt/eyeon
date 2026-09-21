import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs on every request before rendering
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie
  const sessionCookie = request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "pp_session");
  const isAuthenticated = !!sessionCookie?.value;

  // If user is authenticated and visiting root "/", redirect to dashboard
  if (pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected routes: redirect to login if not authenticated
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    // Root path
    "/",
    // Dashboard and all sub-routes
    "/dashboard/:path*",
    // Don't run on static files, api routes, or _next
  ],
};
