import { NextResponse } from "next/server";
import { clearAuthCookiesOnResponse } from "@/lib/api/server";
import { toInvalidMutationOriginBody, validateMutationOrigin } from "@/lib/auth/platform-device-headers";

export async function POST(request: Request) {
  const validation = validateMutationOrigin(request);
  if (!validation.valid) return NextResponse.json(toInvalidMutationOriginBody(validation), { status: 403 });
  const response = NextResponse.json({ status: "ok" });
  await clearAuthCookiesOnResponse(response);
  return response;
}
