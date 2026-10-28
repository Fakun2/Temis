type PlatformLoginResponse = { message?: string; status?: string } & Record<string, unknown>;

export async function readPlatformLoginResponse(
  response: Response
): Promise<PlatformLoginResponse> {
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(
      `No se pudo iniciar sesión: el servidor devolvió una respuesta inválida (HTTP ${response.status}).`
    );
  }
  return body as PlatformLoginResponse;
}
