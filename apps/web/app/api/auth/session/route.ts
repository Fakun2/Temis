import { NextResponse } from "next/server";
import {
  clearAuthCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  getServerAuthSession,
  updateAuthSessionResponse,
  toApiUrl
} from "@/lib/api/server";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import { clearLegacyAuthTokenCookies } from "@/lib/auth/cookie-options";
import { refreshAuthTokens } from "@/lib/auth/token-refresh";
import type { TokenPair } from "@/lib/auth/token-types";

export async function GET() {
  let accessToken = await getAccessTokenCookie();
  let refreshedTokens: TokenPair | null = null;

  if (!accessToken) {
    refreshedTokens = await refreshTokensFromCookie();
    accessToken = refreshedTokens?.accessToken ?? null;
  }

  if (!accessToken) {
    await clearAuthCookies();
    return NextResponse.json({ message: "No hay sesion activa." }, { status: 401 });
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload.sub) {
    refreshedTokens = await refreshTokensFromCookie();
    accessToken = refreshedTokens?.accessToken ?? null;
  }

  const activePayload = accessToken ? decodeJwtPayload(accessToken) : { tenantAccess: [] };
  if (!activePayload.sub) {
    await clearAuthCookies();
    return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
  }

  const tenantId = activePayload.tenantAccess[0]?.tenantId;
  if (tenantId) {
    const response = await fetch(toApiUrl("/api/identity/me"), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-tenant-id": tenantId
      }
    });

    if (!response.ok) {
      await clearAuthCookies();
      return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
    }
  }

  const storedSession = await getServerAuthSession();
  const sessionResponse = NextResponse.json({
    tenantAccess: activePayload.tenantAccess,
    user: {
      avatarUrl: storedSession?.user.avatarUrl ?? null,
      email: storedSession?.user.email ?? activePayload.email ?? "",
      fullName: storedSession?.user.fullName ?? activePayload.email ?? "Usuario",
      id: activePayload.sub,
      phone: storedSession?.user.phone ?? null,
      status: storedSession?.user.status ?? "active"
    }
  });

  if (refreshedTokens) {
    await updateAuthSessionResponse(sessionResponse, refreshedTokens);
  }
  clearLegacyAuthTokenCookies(sessionResponse);

  return sessionResponse;
}

async function refreshTokensFromCookie() {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return null;
  }

  return refreshAuthTokens(refreshToken);
}
