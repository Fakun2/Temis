import { proxyPlatformAuthPost } from "@/lib/api/platform-bff";

export async function POST(request: Request) {
  return proxyPlatformAuthPost(request, "/api/platform-auth/login/start", {
    establishSession: true,
    passThroughFidoChallenge: true
  });
}
