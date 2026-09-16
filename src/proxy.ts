import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "csc_admin";

/**
 * Cheap edge gate: no DB. Real authorization happens in requireAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  // The setup link's own token is the credential, and whoever follows one has
  // no session yet by definition — gating it behind the cookie would send them
  // to a login they cannot pass. The page verifies the token itself.
  if (pathname.startsWith("/admin/setup/")) return NextResponse.next();
  const has = request.cookies.has(COOKIE);
  if (has) return NextResponse.next();
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
