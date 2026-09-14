import { cookies } from "next/headers";
import type { NextResponse as NextResponseType } from "next/server";
import type { LoginResponseDto } from "@temis/api-client";
import { toApiUrl } from "@/lib/api/origin";
import { clearAuthSessionCookies, setAuthSessionCookie } from "@/lib/auth/cookie-options";
import {
  accessTokenCookieName,
  refreshTokenCookieName,
  sessionCookieName
} from "@/lib/auth/cookies";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import type { TemisSession } from "@/lib/auth/session";
import type { TokenPair } from "@/lib/auth/token-types";
import {
  createAuthSession,
  deleteAuthSessionFromCookie,
  readAuthSessionFromCookie,
  updateAuthSessionTokens
} from "@/lib/auth/server-session-store";

export async function createAuthSessionResponse(response: NextResponseType, input: LoginResponseDto) {
  const { cookieValue } = await createAuthSession({
    tokens: input.tokens,
    user: input.user
  });
  setAuthSessionCookie(response, cookieValue);
}

export async function updateAuthSessionResponse(response: NextResponseType, tokens: TokenPair) {
  const current = await readCurrentAuthSession();
  if (!current) {
    return null;
  }

  const updated = await updateAuthSessionTokens(current.sessionId, tokens);
  if (!updated) {
    return null;
  }

  setAuthSessionCookie(response, updated.cookieValue);
  return updated.session;
}

export async function updateCurrentAuthSessionTokens(tokens: TokenPair) {
  const current = await readCurrentAuthSession();
  if (!current) {
    return null;
  }

  return updateAuthSessionTokens(current.sessionId, tokens);
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
  clearAuthSessionCookies(response);
}

export function toClientSession(response: LoginResponseDto): TemisSession {
  return {
    tenantAccess: decodeJwtPayload(response.tokens.accessToken).tenantAccess,
    user: response.user
  };
}

export async function getAccessTokenCookie() {
  return (await readCurrentAuthSession())?.session.tokens.accessToken ?? null;
}

export async function getRefreshTokenCookie() {
  return (await readCurrentAuthSession())?.session.tokens.refreshToken ?? null;
}

export async function getServerAuthSession() {
  return (await readCurrentAuthSession())?.session ?? null;
}

async function readCurrentAuthSession() {
  return readAuthSessionFromCookie((await cookies()).get(sessionCookieName)?.value ?? null);
}

export { toApiUrl };
