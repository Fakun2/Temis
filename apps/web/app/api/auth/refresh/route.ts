import { NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearAuthCookies,
  getRefreshTokenCookie,
  updateAuthSessionResponse,
  toApiUrl
} from "@/lib/api/server";
import {
  toInvalidMutationOriginBody,
  validateMutationOrigin
} from "@/lib/auth/platform-device-headers";

export async function POST(request: Request) {
  const originValidation = validateMutationOrigin(request);
  if (!originValidation.valid) {
    return NextResponse.json(toInvalidMutationOriginBody(originValidation), { status: 403 });
  }
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return NextResponse.json({ message: "No hay refresh token." }, { status: 401 });
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const response = await fetch(toApiUrl("/api/auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers,
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
