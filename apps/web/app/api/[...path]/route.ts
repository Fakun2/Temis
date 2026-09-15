import { NextRequest, NextResponse } from "next/server";
import type { TokenPairDto } from "@temis/api-client";
import {
  clearAuthCookies,
  getAccessTokenCookie,
  getRefreshTokenCookie,
  updateAuthSessionResponse,
  toApiUrl
} from "@/lib/api/server";
import { clearLegacyAuthTokenCookies } from "@/lib/auth/cookie-options";
import { decodeJwtPayload } from "@/lib/auth/jwt";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const requestBody = await getReusableRequestBody(request);
  const initial = await forwardRequest(request, context, requestBody);
  if (initial.status !== 401) {
    return initial;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    await clearAuthCookies();
    return initial;
  }

  const retried = await forwardRequest(request, context, requestBody, refreshed.accessToken);
  await updateAuthSessionResponse(retried, refreshed);
  return retried;
}

async function forwardRequest(
  request: NextRequest,
  context: RouteContext,
  requestBody: BodyInit | undefined,
  accessTokenOverride?: string
) {
  const { path } = await context.params;
  const accessToken = accessTokenOverride ?? (await getAccessTokenCookie());
  const url = new URL(request.url);
  const targetUrl = toApiUrl(`/api/${path.join("/")}${url.search}`);
  const headers = new Headers();
  const contentType = request.headers.get("Content-Type");
  const payload = accessToken ? decodeJwtPayload(accessToken) : null;
  const tenantId = payload?.tenantAccess[0]?.tenantId;

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  const response = await fetch(targetUrl, {
    body: requestBody,
    headers,
    method: request.method,
    // OAuth callbacks must redirect in the browser. Following a 302 here would
    // perform the frontend navigation from the server, without the user's
    // session cookie, and the admin proxy would return the login page.
    redirect: "manual"
  });

  return toProxyResponse(response);
}

async function getReusableRequestBody(request: NextRequest) {
  if (["GET", "HEAD"].includes(request.method)) {
    return undefined;
  }

  return request.arrayBuffer();
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshTokenCookie();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(toApiUrl("/api/auth/refresh"), {
    body: JSON.stringify({ refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    await clearAuthCookies();
    return null;
  }

  const tokens = (await response.json()) as TokenPairDto;
  return tokens;
}

async function toProxyResponse(response: Response) {
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    const headers = new Headers();
    if (location) headers.set("Location", location);
    return new NextResponse(null, { headers, status: response.status });
  }

  const body = await response.arrayBuffer();
  const text = new TextDecoder().decode(body);
  const json = parseJson(text);

  if (json && hasTokenPair(json)) {
    const body = Object.fromEntries(Object.entries(json).filter(([key]) => key !== "tokens"));
    const proxyResponse = NextResponse.json(body, { status: response.status });
    await updateAuthSessionResponse(proxyResponse, json.tokens);
    return proxyResponse;
  }

  if (!response.ok) {
    const proxyResponse = NextResponse.json(normalizeErrorBody(json, response.status), {
      status: response.status
    });
    clearLegacyAuthTokenCookies(proxyResponse);
    return proxyResponse;
  }

  const proxyResponse = new NextResponse(body, {
    headers: {
      ...getPassthroughHeaders(response)
    },
    status: response.status
  });
  clearLegacyAuthTokenCookies(proxyResponse);
  return proxyResponse;
}

function getPassthroughHeaders(response: Response) {
  const headers: Record<string, string> = {};
  const contentType = response.headers.get("Content-Type");
  const contentDisposition = response.headers.get("Content-Disposition");
  const contentLength = response.headers.get("Content-Length");
  const cacheControl = response.headers.get("Cache-Control");

  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (contentDisposition) {
    headers["Content-Disposition"] = contentDisposition;
  }
  if (contentLength) {
    headers["Content-Length"] = contentLength;
  }
  if (cacheControl) {
    headers["Cache-Control"] = cacheControl;
  }

  return headers;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasTokenPair(value: Record<string, unknown>): value is { tokens: TokenPairDto } {
  const tokens = value.tokens as Partial<TokenPairDto> | undefined;
  return Boolean(tokens?.accessToken && tokens.refreshToken);
}

function normalizeErrorBody(body: Record<string, unknown> | null, status: number) {
  const message = body?.message;

  return {
    details: body ?? undefined,
    message:
      typeof message === "string" || Array.isArray(message)
        ? message
        : `TEMIS API request failed: ${status}`,
    statusCode: status
  };
}
