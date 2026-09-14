import { NextRequest, NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearAuthCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  toApiUrl,
  updateAuthSessionResponse
} from "@/lib/api/server";
import { decodeJwtPayload } from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const response = await forwardStream(request);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    await clearAuthCookies();
    return response;
  }

  const retried = await forwardStream(request, refreshed.accessToken);
  await updateAuthSessionResponse(retried, refreshed);
  return retried;
}

async function forwardStream(request: NextRequest, accessTokenOverride?: string) {
  const accessToken = accessTokenOverride ?? (await getAccessTokenCookie());
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  const tenantId = payload?.tenantAccess[0]?.tenantId;

  if (!accessToken || !tenantId) {
    return NextResponse.json({ message: "No hay una sesion activa." }, { status: 401 });
  }

  const response = await fetch(toApiUrl("/api/notifications/stream"), {
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
      "x-tenant-id": tenantId
    },
    method: "GET",
    signal: request.signal
  });

  if (!response.ok || !response.body) {
    return new NextResponse(response.body, {
      headers: getStreamHeaders(response),
      status: response.status
    });
  }

  return new NextResponse(response.body, {
    headers: getStreamHeaders(response),
    status: response.status
  });
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(toApiUrl("/api/auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    await clearAuthCookies();
    return null;
  }

  return (await response.json()) as TokenPairDto;
}

function getStreamHeaders(response: Response) {
  return {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream"
  };
}
