import { NextResponse } from "next/server";
import { toApiUrl } from "@/lib/api/server";

export async function POST(request: Request) {
  const response = await fetch(toApiUrl("/api/auth/password-recovery/confirm"), {
    body: await request.text(),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  }).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor de autenticación." },
      { status: 503 }
    );
  }

  return NextResponse.json(await response.json().catch(() => null), { status: response.status });
}
