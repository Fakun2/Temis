import type { TemisSession } from "./session";
import { hasTenantAccess } from "./session";

export function getAuthenticatedRedirectPath(session: TemisSession, nextPath: string | null) {
  if (!hasTenantAccess(session)) {
    return "/onboarding";
  }

  if (!nextPath) {
    return "/admin";
  }

  return isSafeAdminPath(nextPath) ? nextPath : "/admin";
}

function isSafeAdminPath(path: string) {
  return path.startsWith("/admin") && !path.startsWith("//") && !path.includes("://");
}
