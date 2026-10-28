export type JwtTenantAccess = {
  tenantId: string;
  role: string | null;
  permissions: string[];
};

export type JwtPlatformAccess = {
  role: "super_admin";
  permissions: string[];
  securityMode: "disabled" | "required";
};

export type JwtAuthenticationMethod = "pwd" | "webauthn" | "device_posture";

type JwtPayloadBase = {
  sub: string;
  email: string;
  sessionVersion: number;
};

export type TenantJwtPayload = JwtPayloadBase & {
  sessionKind: "tenant";
  tenantAccess: JwtTenantAccess[];
};

export type PlatformJwtPayload = JwtPayloadBase & {
  sessionKind: "platform";
  platformAccess: JwtPlatformAccess;
  sid: string;
  platformDeviceId?: string;
  amr: JwtAuthenticationMethod[];
  authTime: string;
  postureCheckedAt?: string;
};

export type JwtPayload = TenantJwtPayload | PlatformJwtPayload;

export type AuthenticatedRequest = {
  user?: JwtPayload;
  activeTenantId?: string;
};

export type TenantAuthenticatedRequest = Omit<AuthenticatedRequest, "user"> & {
  user?: TenantJwtPayload;
};

export type PlatformAuthenticatedRequest = Omit<AuthenticatedRequest, "user"> & {
  user?: PlatformJwtPayload;
};
