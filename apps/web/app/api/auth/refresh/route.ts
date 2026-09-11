import { NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearAuthCookies,
  getRefreshTokenCookie,
  updateAuthSessionResponse,
  toApiUrl
} from "@/lib/api/server";

export async function POST() {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return NextResponse.json({ message: "No hay refresh token." }, { status: 401 });
  }

  const response = await fetch(toApiUrl("/api/auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const body = (await response.json().catch(() => null)) as TokenPairDto | unknown;

  if (!response.ok) {
    await clearAuthCookies();
    return NextResponse.json(body, { status: response.status });
  }

  const refreshNextResponse = NextResponse.json({ status: "ok" });
  await updateAuthSessionResponse(refreshNextResponse, body as TokenPairDto);
  return refreshNextResponse;
}
