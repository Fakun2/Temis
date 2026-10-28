import { NextRequest, NextResponse } from "next/server";
import { platformSessionCookieName, sessionCookieName } from "./cookies";
import { decodeSessionCookie } from "./session-cookie";

export function getRequestSessionMeta(request: NextRequest, scope: "tenant" | "platform") {
  const name = scope === "platform" ? platformSessionCookieName : sessionCookieName;
  return decodeSessionCookie(request.cookies.get(name)?.value);
}

export function redirectToLogin(request: NextRequest, options?: { clearScope?: "tenant" | "platform"; loginPath?: string }) {
  const loginUrl = new URL(options?.loginPath ?? "/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);

  if (options?.clearScope) {
    response.cookies.delete(options.clearScope === "platform" ? platformSessionCookieName : sessionCookieName);
  }

  return response;
}
