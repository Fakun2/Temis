import type { SuperAdminSession } from "./superadmin-session";

export function hasSuperAdminPermission(session: SuperAdminSession | null, permission: string) {
  return session?.platformAccess.permissions.includes(permission) ?? false;
}
