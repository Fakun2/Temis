import { NextResponse } from "next/server";
import {
  clearPlatformAuthCookiesOnResponse,
  getPlatformRefreshToken,
  toApiUrl
} from "@/lib/api/server";
import { platformJsonHeaders, rejectInvalidPlatformMutation } from "@/lib/api/platform-bff";

export async function POST(request: Request) {
  const rejected = rejectInvalidPlatformMutation(request);
  if (rejected) return rejected;
  const refreshToken = await getPlatformRefreshToken();
  if (refreshToken) {
    await fetch(toApiUrl("/api/platform-auth/logout"), {
      body: JSON.stringify({ refreshToken }),
      headers: platformJsonHeaders(request),
      method: "POST"
    }).catch(() => null);
  }
  const response = NextResponse.json({ status: "ok" });
  await clearPlatformAuthCookiesOnResponse(response);
  return response;
}
