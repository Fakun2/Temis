import { NextResponse } from "next/server";
import { clearAuthCookies, getAccessTokenCookie, getServerAuthSession, toApiUrl, updateAuthSessionResponse } from "@/lib/api/server";
import { clearLegacyAuthTokenCookies } from "@/lib/auth/cookie-options";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import { refreshAuthTokens } from "@/lib/auth/token-refresh";

export async function GET() {
  let accessToken = await getAccessTokenCookie();
  let refreshedTokens = null;
  if (!accessToken) {
    refreshedTokens = await refreshAuthTokensFromTenantCookie();
    accessToken = refreshedTokens?.accessToken ?? null;
  }
  let payload = accessToken ? decodeJwtPayload(accessToken) : null;
  if (!payload || payload.sessionKind !== "tenant" || !payload.sub) {
    refreshedTokens = await refreshAuthTokensFromTenantCookie();
    accessToken = refreshedTokens?.accessToken ?? null;
    payload = accessToken ? decodeJwtPayload(accessToken) : null;
  }
  if (!accessToken || !payload || payload.sessionKind !== "tenant" || !payload.sub) {
    await clearAuthCookies();
    return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
  }
  const tenantId = payload.tenantAccess[0]?.tenantId;
  if (!tenantId) {
    await clearAuthCookies();
    return NextResponse.json({ message: "Sesion tenant invalida." }, { status: 401 });
  }
  const identity = await fetch(toApiUrl("/api/identity/me"), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId }
  });
  if (!identity.ok) {
    await clearAuthCookies();
    return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
  }
  const stored = await getServerAuthSession();
  if (!stored || stored.sessionKind !== "tenant") {
    await clearAuthCookies();
    return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
  }
  const response = NextResponse.json({
    tenantAccess: payload.tenantAccess,
    user: {
      avatarUrl: stored.user.avatarUrl ?? null,
      email: stored.user.email ?? payload.email ?? "",
      fullName: stored.user.fullName ?? payload.email ?? "Usuario",
      id: payload.sub,
      phone: stored.user.phone ?? null,
      status: stored.user.status ?? "active"
    }
  });
  if (refreshedTokens) await updateAuthSessionResponse(response, refreshedTokens);
  clearLegacyAuthTokenCookies(response);
  return response;
}

async function refreshAuthTokensFromTenantCookie() {
  const { getRefreshTokenCookie } = await import("@/lib/api/server");
  const refreshToken = await getRefreshTokenCookie();
  return refreshToken ? refreshAuthTokens(refreshToken) : null;
}
