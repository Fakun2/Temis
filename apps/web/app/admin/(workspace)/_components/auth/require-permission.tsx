"use client";

import type { ReactNode } from "react";
import { UnauthorizedState } from "@/components/ui/not-found";
import { hasPermissions, type PermissionMode } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/use-session";

export function RequirePermission({
  children,
  fallback,
  mode = "all",
  permissions
}: {
  children: ReactNode;
  fallback?: ReactNode;
  mode?: PermissionMode;
  permissions: string[];
}) {
  const session = useSession();

  if (hasPermissions(session, permissions, mode)) {
    return <>{children}</>;
  }

  return <>{fallback ?? <RestrictedPermission />}</>;
}

function RestrictedPermission() {
  return (
    <UnauthorizedState
      title="Area restringida"
      description="Necesitas permisos adicionales para acceder a esta area."
    />
  );
}
