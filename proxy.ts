import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Optimistic check only (is there a session cookie at all?). Every page and action still
// validates the session against the database through lib/auth/dal.ts.

const PUBLIC_PATHS = ["/login", "/setup", "/offline", "/api/health"];
const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? request.nextUrl.protocol.replace(":", "")) === "https";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) return new NextResponse("Unauthorized", { status: 401 });
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  if (token) {
    // Sliding expiry: the cookie stays alive as long as the person keeps using the app.
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps(request),
      path: "/",
      maxAge: COOKIE_MAX_AGE_S,
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw\\.js|manifest\\.webmanifest|icon\\.svg|apple-icon\\.png|favicon\\.ico|robots\\.txt).*)",
  ],
};
