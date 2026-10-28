import { toApiUrl } from "@/lib/api/origin";
import type { TokenPair } from "./token-types";

export async function refreshAuthTokens(refreshToken: string, headers = new Headers()) {
  headers.set("Content-Type", "application/json");
  const response = await fetch(toApiUrl("/api/auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers,
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as TokenPair | null;
}
