import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { getPlatformAccessToken, getPlatformServerSession, toApiUrl } from "@/lib/api/server";
import { copyPlatformDeviceHeaders } from "@/lib/auth/platform-device-headers";
import type { SuperAdminAccess, SuperAdminSession } from "@/lib/auth/superadmin-session";

export async function requestPlatformApiServer<TResponse>(path: string): Promise<TResponse> {
  const accessToken = await getPlatformAccessToken();
  if (!accessToken) throw new Error("No hay una sesión de plataforma activa.");
  const incomingHeaders = await headers();
  const request = new Request("http://temis.local", { headers: incomingHeaders });
  const forwardedHeaders = copyPlatformDeviceHeaders(request);
  forwardedHeaders.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(toApiUrl(path), {
    cache: "no-store",
    headers: forwardedHeaders
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : typeof body?.message === "string"
        ? body.message
        : `No se pudo cargar la plataforma (${response.status}).`;
    throw new Error(message);
  }
  return response.json() as Promise<TResponse>;
}

export const getVerifiedPlatformSession = cache(async (): Promise<SuperAdminSession | null> => {
  const stored = await getPlatformServerSession();
  if (!stored || stored.sessionKind !== "platform") return null;
  try {
    const platformAccess = await requestPlatformApiServer<SuperAdminAccess>("/api/platform/me");
    return {
      platformAccess,
      user: {
        avatarUrl: typeof stored.user.avatarUrl === "string" ? stored.user.avatarUrl : null,
        email: stored.user.email,
        fullName: stored.user.fullName,
        id: stored.user.id,
        phone: typeof stored.user.phone === "string" ? stored.user.phone : null,
        status: stored.user.status
      }
    };
  } catch {
    return null;
  }
});
