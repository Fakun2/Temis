import { cookies } from "next/headers";
import type { NextResponse as NextResponseType } from "next/server";
import type { LoginResponseDto } from "@temis/api-client";
import { toApiUrl } from "@/lib/api/origin";
import {
  clearLegacyAuthTokenCookies,
  setAuthSessionCookie,
  setPlatformSessionCookie
} from "@/lib/auth/cookie-options";
import {
  accessTokenCookieName,
  refreshTokenCookieName,
  sessionCookieName,
  platformSessionCookieName
} from "@/lib/auth/cookies";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import type { TenantSession } from "@/lib/auth/session";
import type { SuperAdminSession } from "@/lib/auth/superadmin-session";
import type { TokenPair } from "@/lib/auth/token-types";
import {
  createAuthSession,
  deleteAuthSessionFromCookie,
  readAuthSessionFromCookie,
  updateAuthSessionTokens
} from "@/lib/auth/server-session-store";

export async function createAuthSessionResponse(
  response: NextResponseType,
  input: LoginResponseDto
) {
  const payload = decodeJwtPayload(input.tokens.accessToken);
  if (!payload || payload.sessionKind !== "tenant") throw new Error("Token tenant invalido.");
  const { cookieValue } = await createAuthSession({ tokens: input.tokens, user: input.user });
  setAuthSessionCookie(response, cookieValue);
}

export async function createPlatformAuthSessionResponse(response: NextResponseType, input: LoginResponseDto) {
  const payload = decodeJwtPayload(input.tokens.accessToken);
  if (!payload || payload.sessionKind !== "platform") throw new Error("Token de plataforma invalido.");
  const { cookieValue } = await createAuthSession({ tokens: input.tokens, user: input.user });
  setPlatformSessionCookie(response, cookieValue);
}

export async function updateAuthSessionResponse(response: NextResponseType, tokens: TokenPair) {
  const current = await readCurrentAuthSession("tenant");
  if (!current) {
    return null;
  }

  const updated = await updateAuthSessionTokens(current.sessionId, tokens, "tenant");
  if (!updated) {
    return null;
  }

  setAuthSessionCookie(response, updated.cookieValue);
  return updated.session;
}

export async function updateCurrentAuthSessionTokens(tokens: TokenPair) {
  const current = await readCurrentAuthSession("tenant");
  if (!current) {
    return null;
  }

  return updateAuthSessionTokens(current.sessionId, tokens, "tenant");
}

export async function updatePlatformAuthSessionResponse(response: NextResponseType, tokens: TokenPair) {
  const current = await readCurrentAuthSession("platform");
  if (!current) return null;
  const updated = await updateAuthSessionTokens(current.sessionId, tokens, "platform");
  if (!updated) return null;
  setPlatformSessionCookie(response, updated.cookieValue);
  return updated.session;
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  await deleteAuthSessionFromCookie(cookieStore.get(sessionCookieName)?.value ?? null);
  cookieStore.delete(sessionCookieName);
  cookieStore.delete(accessTokenCookieName);
  cookieStore.delete(refreshTokenCookieName);
}

export async function clearAuthCookiesOnResponse(response: NextResponseType) {
  await deleteAuthSessionFromCookie((await cookies()).get(sessionCookieName)?.value ?? null);
  response.cookies.delete(sessionCookieName);
  clearLegacyAuthTokenCookies(response);
}

export async function clearPlatformAuthCookiesOnResponse(response: NextResponseType) {
  await deleteAuthSessionFromCookie((await cookies()).get(platformSessionCookieName)?.value ?? null);
  response.cookies.delete(platformSessionCookieName);
}

export function toClientSession(response: LoginResponseDto): TenantSession {
  const payload = decodeJwtPayload(response.tokens.accessToken);
  if (!payload || payload.sessionKind !== "tenant") throw new Error("Token tenant invalido.");
  return {
    tenantAccess: payload.tenantAccess,
    user: response.user
  };
}

export function toPlatformClientSession(response: LoginResponseDto): SuperAdminSession {
  const payload = decodeJwtPayload(response.tokens.accessToken);
  if (!payload || payload.sessionKind !== "platform") throw new Error("Token de plataforma invalido.");
  return {
    platformAccess: payload.platformAccess,
    user: {
      avatarUrl: typeof response.user.avatarUrl === "string" ? response.user.avatarUrl : null,
      email: response.user.email,
      fullName: response.user.fullName,
      id: response.user.id,
      phone: typeof response.user.phone === "string" ? response.user.phone : null,
      status: response.user.status
    }
  };
}

export async function getAccessTokenCookie() {
  return (await readCurrentAuthSession("tenant"))?.session.tokens.accessToken ?? null;
}

export async function getRefreshTokenCookie() {
  return (await readCurrentAuthSession("tenant"))?.session.tokens.refreshToken ?? null;
}

export async function getServerAuthSession() {
  return (await readCurrentAuthSession("tenant"))?.session ?? null;
}

export async function getPlatformAccessToken() {
  return (await readCurrentAuthSession("platform"))?.session.tokens.accessToken ?? null;
}

export async function getPlatformRefreshToken() {
  return (await readCurrentAuthSession("platform"))?.session.tokens.refreshToken ?? null;
}

export async function getPlatformServerSession() {
  return (await readCurrentAuthSession("platform"))?.session ?? null;
}

async function readCurrentAuthSession(kind: "tenant" | "platform") {
  const cookieStore = await cookies();
  const name = kind === "platform" ? platformSessionCookieName : sessionCookieName;
  return readAuthSessionFromCookie(cookieStore.get(name)?.value ?? null, kind);
}

export { toApiUrl };
