import type { LoginResponseDto } from "@temis/api-client";
import { NextResponse } from "next/server";
import {
  createPlatformAuthSessionResponse,
  toApiUrl,
  toPlatformClientSession
} from "@/lib/api/server";
import {
  copyPlatformDeviceHeaders,
  toInvalidMutationOriginBody,
  validateMutationOrigin
} from "@/lib/auth/platform-device-headers";

type PlatformAuthProxyOptions = {
  establishSession?: boolean;
  passThroughFidoChallenge?: boolean;
};

export function rejectInvalidPlatformMutation(request: Request) {
  const validation = validateMutationOrigin(request);
  return validation.valid
    ? null
    : NextResponse.json(toInvalidMutationOriginBody(validation), { status: 403 });
}

export function platformJsonHeaders(request: Request) {
  const headers = copyPlatformDeviceHeaders(request);
  headers.set("Content-Type", "application/json");
  return headers;
}

export async function proxyPlatformAuthPost(
  request: Request,
  path: string,
  options: PlatformAuthProxyOptions = {}
) {
  const rejected = rejectInvalidPlatformMutation(request);
  if (rejected) return rejected;

  let upstream: Response;
  try {
    upstream = await fetch(toApiUrl(path), {
      body: await request.text(),
      headers: platformJsonHeaders(request),
      method: "POST"
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "No se pudo conectar con la API. Verificá que el servidor esté disponible y reintentá."
      },
      { status: 503 }
    );
  }
  const body: unknown = await upstream.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      {
        message:
          "La API devolvió una respuesta inválida. Reintentá o revisá los registros del servidor."
      },
      { status: upstream.ok ? 502 : upstream.status }
    );
  }
  const isFidoChallenge =
    options.passThroughFidoChallenge &&
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    body.status === "fido_required";

  if (!upstream.ok || isFidoChallenge || !options.establishSession) {
    return NextResponse.json(body, { status: upstream.status });
  }

  try {
    const login = body as LoginResponseDto;
    const response = NextResponse.json(toPlatformClientSession(login));
    await createPlatformAuthSessionResponse(response, login);
    return response;
  } catch (error) {
    console.error(
      "No se pudo establecer la sesión de Super Admin:",
      error instanceof Error ? error.message : "Error desconocido"
    );
    return NextResponse.json(
      {
        message:
          "No se pudo establecer la sesión. Verificá la configuración del servidor y reintentá."
      },
      { status: 503 }
    );
  }
}
