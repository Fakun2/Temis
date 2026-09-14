import { NextResponse } from "next/server";
import type { LoginResponseDto } from "@temis/api-client";
import { createAuthSessionResponse, toApiUrl, toClientSession } from "@/lib/api/server";

export async function POST(request: Request) {
  const requestBody = await request.text();
  const response = await fetch(toApiUrl("/api/auth/login"), {
    body: requestBody,
    headers: { "Content-Type": "application/json" },
    method: "POST"
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor de autenticacion." },
      { status: 503 }
    );
  }

  const body = (await response.json().catch(() => null)) as LoginResponseDto | unknown;

  if (!response.ok) {
    return NextResponse.json(body ?? { message: "No se pudo iniciar sesion." }, {
      status: response.status
    });
  }

  const loginResponse = body as LoginResponseDto;
  const loginNextResponse = NextResponse.json(toClientSession(loginResponse), { status: 200 });
  await createAuthSessionResponse(loginNextResponse, loginResponse);

  return loginNextResponse;
}
