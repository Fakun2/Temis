import { NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearPlatformAuthCookiesOnResponse,
  getPlatformRefreshToken,
  toApiUrl,
  updatePlatformAuthSessionResponse
} from "@/lib/api/server";
import { platformJsonHeaders, rejectInvalidPlatformMutation } from "@/lib/api/platform-bff";

export async function POST(request: Request) {
  const rejected = rejectInvalidPlatformMutation(request);
  if (rejected) return rejected;
  const refreshToken = await getPlatformRefreshToken();
  if (!refreshToken)
    return NextResponse.json({ message: "No hay sesion activa." }, { status: 401 });
  const upstream = await fetch(toApiUrl("/api/platform-auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers: platformJsonHeaders(request),
    method: "POST"
  });
  const body = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const response = NextResponse.json(body, { status: upstream.status });
    await clearPlatformAuthCookiesOnResponse(response);
    return response;
  }
  const response = NextResponse.json({ status: "ok" });
  await updatePlatformAuthSessionResponse(response, body as TokenPairDto);
  return response;
}
