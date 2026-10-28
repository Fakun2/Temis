import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";

export type PlatformDeviceIdentity = {
  certificateFingerprint: string;
  externalDeviceId: string;
};

export type PlatformRequestMetadata = {
  device: PlatformDeviceIdentity;
  ipAddress: string;
  userAgent: string;
};

export type PlatformRequestContext = Omit<PlatformRequestMetadata, "device"> & {
  device?: PlatformDeviceIdentity;
};

export function getPlatformRequestContext(request: Request): PlatformRequestContext {
  const verified = header(request, "x-temis-mtls-verified");
  const certificateFingerprint = normalizeFingerprint(
    header(request, "x-temis-device-certificate-fingerprint")
  );
  const externalDeviceId = header(request, "x-temis-device-id");

  return {
    device:
      verified === "SUCCESS" && certificateFingerprint && externalDeviceId
        ? { certificateFingerprint, externalDeviceId }
        : undefined,
    ipAddress: request.ip ?? request.socket.remoteAddress ?? "unknown",
    userAgent: header(request, "user-agent") ?? "unknown"
  };
}

export function getPlatformRequestMetadata(request: Request): PlatformRequestMetadata {
  const context = getPlatformRequestContext(request);
  if (!context.device) {
    throw new ForbiddenException({
      code: "device_not_enrolled",
      message: "Se requiere un dispositivo administrado y autenticado."
    });
  }

  return {
    ...context,
    device: context.device
  };
}

function header(request: Request, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFingerprint(value?: string) {
  const normalized = value?.replaceAll(":", "").trim().toLowerCase();
  return normalized && /^[a-f0-9]{40,128}$/.test(normalized) ? normalized : null;
}
