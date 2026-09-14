"use client";

import { useMemo } from "react";
import { hasPermission } from "@/lib/auth/permissions";

export function useTasksPermissions(session: Parameters<typeof hasPermission>[0]) {
  return useMemo(
    () => ({
      canCreate: hasPermission(session, "tasks:create"),
      canDelete: hasPermission(session, "tasks:delete"),
      canUpdate: hasPermission(session, "tasks:update")
    }),
    [session]
  );
}
