import { NextRequest, NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearPlatformAuthCookiesOnResponse,
  getPlatformAccessToken,
  getPlatformRefreshToken,
  toApiUrl,
  updatePlatformAuthSessionResponse
} from "@/lib/api/server";
import { copyPlatformDeviceHeaders, toInvalidMutationOriginBody, validateMutationOrigin } from "@/lib/auth/platform-device-headers";
import { decodeJwtPayload } from "@/lib/auth/jwt";

type Context = { params: Promise<{ path: string[] }> };

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

async function proxy(request: NextRequest, context: Context) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const validation = validateMutationOrigin(request);
    if (!validation.valid) return NextResponse.json(toInvalidMutationOriginBody(validation), { status: 403 });
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  let response = await forward(request, context, body);
  if (response.status !== 401) return response;
  const tokens = await refresh(request);
  if (!tokens) {
    await clearPlatformAuthCookiesOnResponse(response);
    return response;
  }
  response = await forward(request, context, body, tokens.accessToken);
  await updatePlatformAuthSessionResponse(response, tokens);
  return response;
}

async function forward(request: NextRequest, context: Context, body?: BodyInit, override?: string) {
  const accessToken = override ?? await getPlatformAccessToken();
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  if (!accessToken || payload?.sessionKind !== "platform") {
    return NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
  }
  const { path } = await context.params;
  const url = new URL(request.url);
  const headers = copyPlatformDeviceHeaders(request);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const upstream = await fetch(toApiUrl(`/api/platform/${path.join("/")}${url.search}`), {
    body, headers, method: request.method, redirect: "manual"
  });
  const responseBody = await upstream.arrayBuffer();
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control", "location"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new NextResponse(responseBody, { headers: responseHeaders, status: upstream.status });
}

async function refresh(request: Request) {
  const refreshToken = await getPlatformRefreshToken();
  if (!refreshToken) return null;
  const headers = copyPlatformDeviceHeaders(request);
  headers.set("Content-Type", "application/json");
  const response = await fetch(toApiUrl("/api/platform-auth/refresh"), {
    body: JSON.stringify({ refreshToken }), headers, method: "POST"
  });
  return response.ok ? await response.json() as TokenPairDto : null;
}
