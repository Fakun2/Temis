export const PLATFORM_PERMISSIONS = [
  "platform:access",
  "platform:account:self_manage",
  "platform:observability:read",
  "platform:users:read",
  "platform:announcements:manage"
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const platformWorkerHeartbeatKey = "temis:platform:worker:heartbeat";
export const platformWorkerHeartbeatTtlSeconds = 45;
