const trustedDeviceHeaders = [
  "x-temis-mtls-verified",
  "x-temis-device-certificate-fingerprint",
  "x-temis-device-id"
] as const;

export type MutationOriginScope = "any" | "platform";

export type MutationOriginValidation = {
  effectiveRequestOrigin: string | null;
  expectedOrigins: string[];
  receivedOrigin: string | null;
  reason:
    | "allowed"
    | "invalid_origin"
    | "missing_origin"
    | "origin_mismatch"
    | "platform_host_mismatch"
    | "platform_url_not_configured";
  valid: boolean;
};

export function copyPlatformDeviceHeaders(request: Request, target = new Headers()) {
  for (const name of trustedDeviceHeaders) {
    const value = request.headers.get(name);
    if (value) target.set(name, value);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");
  if (forwardedFor) target.set("x-forwarded-for", forwardedFor);
  if (userAgent) target.set("user-agent", userAgent);
  return target;
}

export function hasValidMutationOrigin(request: Request) {
  return validateMutationOrigin(request).valid;
}

export function isPlatformHost(request: Request) {
  const configured = process.env.PLATFORM_PUBLIC_URL;
  if (!configured) return false;
  try {
    const effectiveOrigin = getEffectiveRequestOrigin(request);
    return Boolean(
      effectiveOrigin &&
      new URL(effectiveOrigin).host.toLowerCase() === new URL(configured).host.toLowerCase()
    );
  } catch {
    return false;
  }
}

export function hasValidPlatformMutationOrigin(request: Request) {
  return validateMutationOrigin(request, "platform").valid;
}

export function validateMutationOrigin(
  request: Request,
  scope: MutationOriginScope = "any"
): MutationOriginValidation {
  const rawOrigin = request.headers.get("origin");
  const receivedOrigin = normalizeOrigin(rawOrigin);
  const effectiveRequestOrigin = getEffectiveRequestOrigin(request);
  const configuredPlatformOrigin = normalizeOrigin(process.env.PLATFORM_PUBLIC_URL);
  const expectedOrigins = uniqueOrigins(
    scope === "platform"
      ? [configuredPlatformOrigin, configuredPlatformOrigin ? null : effectiveRequestOrigin]
      : [
          normalizeOrigin(process.env.FRONTEND_PUBLIC_URL),
          configuredPlatformOrigin,
          normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
          effectiveRequestOrigin
        ]
  );

  if (!rawOrigin) {
    return result(false, "missing_origin");
  }
  if (!receivedOrigin) {
    return result(false, "invalid_origin");
  }
  if (scope === "platform") {
    if (!configuredPlatformOrigin && process.env.NODE_ENV === "production") {
      return result(false, "platform_url_not_configured");
    }
    if (!isPlatformHost(request)) {
      return result(false, "platform_host_mismatch");
    }
  }
  if (!expectedOrigins.includes(receivedOrigin)) {
    return result(false, "origin_mismatch");
  }
  return result(true, "allowed");

  function result(
    valid: boolean,
    reason: MutationOriginValidation["reason"]
  ): MutationOriginValidation {
    return { effectiveRequestOrigin, expectedOrigins, receivedOrigin, reason, valid };
  }
}

export function toInvalidMutationOriginBody(validation: MutationOriginValidation) {
  return {
    code: "invalid_request_origin",
    details: {
      effectiveRequestOrigin: validation.effectiveRequestOrigin,
      expectedOrigins: validation.expectedOrigins,
      reason: validation.reason,
      receivedOrigin: validation.receivedOrigin
    },
    message: "Origen de solicitud invalido. Revisa los detalles de origen recibido y esperado.",
    statusCode: 403
  };
}

function getEffectiveRequestOrigin(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
    const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
    const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    const protocol = forwardedProtocol ?? requestUrl.protocol.replace(/:$/, "");
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function uniqueOrigins(origins: Array<string | null>) {
  return [...new Set(origins.filter((origin): origin is string => Boolean(origin)))];
}
