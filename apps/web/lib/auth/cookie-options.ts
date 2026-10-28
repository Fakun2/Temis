import type { NextResponse } from "next/server";
import {
  accessTokenCookieName,
  refreshTokenCookieName,
  sessionCookieName,
  sessionMaxAgeSeconds,
  platformSessionCookieName,
  platformSessionMaxAgeSeconds
} from "./cookies";

export function setAuthSessionCookie(response: NextResponse, sessionCookieValue: string) {
  response.cookies.set(sessionCookieName, sessionCookieValue, {
    maxAge: sessionMaxAgeSeconds,
    ...authCookieOptions()
  });
  clearLegacyAuthTokenCookies(response);
}

export function setPlatformSessionCookie(response: NextResponse, sessionCookieValue: string) {
  response.cookies.set(platformSessionCookieName, sessionCookieValue, {
    httpOnly: true,
    maxAge: platformSessionMaxAgeSeconds,
    path: "/",
    sameSite: "strict",
    secure: shouldUseSecureCookies()
  });
}

export function clearAuthSessionCookies(response: NextResponse) {
  response.cookies.delete(sessionCookieName);
  clearLegacyAuthTokenCookies(response);
}

export function clearLegacyAuthTokenCookies(response: NextResponse) {
  response.cookies.delete(accessTokenCookieName);
  response.cookies.delete(refreshTokenCookieName);
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies()
  };
}

function shouldUseSecureCookies() {
  const configuredValue = process.env.AUTH_COOKIE_SECURE;
  if (configuredValue !== undefined) {
    return configuredValue.toLowerCase() === "true";
  }

  return [
    process.env.FRONTEND_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ].some((url) => url?.startsWith("https://"));
}
