import { NextRequest, NextResponse } from "next/server";
import { getRequestSessionMeta, redirectToLogin } from "@/lib/auth/proxy-auth";

const tenantPublicPaths = ["/create-account", "/forgot-password", "/reset-password"];
const superAdminPublicPaths = ["/superadmin/login", "/superadmin/enroll"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const legacy = getLegacySuperAdminPath(pathname);
  if (legacy) return NextResponse.redirect(new URL(legacy, request.url), 308);

  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    if (isPathWithin(pathname, superAdminPublicPaths)) return NextResponse.next();
    const session = getRequestSessionMeta(request, "platform");
    return session
      ? NextResponse.next()
      : redirectToLogin(request, { clearScope: "platform", loginPath: "/superadmin/login" });
  }

  if (isPathWithin(pathname, tenantPublicPaths) || pathname === "/login" || pathname === "/") return NextResponse.next();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const session = getRequestSessionMeta(request, "tenant");
    return session ? NextResponse.next() : redirectToLogin(request, { clearScope: "tenant" });
  }
  return NextResponse.next();
}

function getLegacySuperAdminPath(pathname: string) {
  if (pathname === "/platform-enroll") return "/superadmin/enroll";
  if (pathname === "/admin/platform") return "/superadmin";
  if (pathname.startsWith("/admin/platform/")) return pathname.replace("/admin/platform", "/superadmin");
  return null;
}

function isPathWithin(pathname: string, roots: string[]) {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export const config = {
  matcher: [
    "/", "/login", "/admin/:path*", "/superadmin/:path*", "/create-account/:path*",
    "/forgot-password/:path*", "/platform-enroll", "/reset-password/:path*"
  ]
};
