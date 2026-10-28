import { NextResponse } from "next/server";
import {
  clearPlatformAuthCookiesOnResponse,
  getPlatformAccessToken,
  getPlatformServerSession,
  toApiUrl
} from "@/lib/api/server";
import { copyPlatformDeviceHeaders } from "@/lib/auth/platform-device-headers";
import { decodeJwtPayload } from "@/lib/auth/jwt";

export async function GET(request: Request) {
  const accessToken = await getPlatformAccessToken();
  const stored = await getPlatformServerSession();
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  if (!accessToken || !stored || stored.sessionKind !== "platform" || payload?.sessionKind !== "platform") {
    const response = NextResponse.json({ message: "No hay sesion activa." }, { status: 401 });
    await clearPlatformAuthCookiesOnResponse(response);
    return response;
  }
  const headers = copyPlatformDeviceHeaders(request);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const upstream = await fetch(toApiUrl("/api/platform/me"), { cache: "no-store", headers });
  if (!upstream.ok) {
    const response = NextResponse.json({ message: "Sesion invalida." }, { status: 401 });
    await clearPlatformAuthCookiesOnResponse(response);
    return response;
  }
  return NextResponse.json({ platformAccess: payload.platformAccess, user: stored.user });
}
