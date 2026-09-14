"use client";

import type { TemisSession } from "./session";
import { saveSession } from "./session";

export type GoogleCredentialResponse = {
  credential?: string;
};

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch("/api/auth/google", {
    body: JSON.stringify({ idToken: credential }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  const data = (await response.json().catch(() => null)) as TemisSession | unknown;

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data));
  }

  const session = data as TemisSession;
  saveSession(session);
  return session;
}

export function getApiErrorMessage(data: unknown) {
  if (typeof data === "object" && data && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return "No se pudo iniciar sesion con Google.";
}
