"use client";

import { useMemo } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { getActiveTenantAccess, hasPermission } from "@/lib/auth/permissions";
import type { TemisSession } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";

type DashboardMutationContext = {
  session: TemisSession;
  tenantId: string;
};

type DashboardMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables, context: DashboardMutationContext) => Promise<TData>;
  permission?: string;
};

export function useDashboardMutation<TData, TVariables>({
  mutationFn,
  permission,
  ...options
}: DashboardMutationOptions<TData, TVariables>) {
  const session = useSession();
  const tenantAccess = useMemo(() => getActiveTenantAccess(session), [session]);
  const tenantId = tenantAccess?.tenantId ?? null;
  const allowed = permission ? hasPermission(session, permission) : true;

  const mutation = useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn: (variables) => {
      if (!session || !tenantId || !allowed) {
        throw new Error("No tenes permisos para realizar esta accion.");
      }

      return mutationFn(variables, { session, tenantId });
    }
  });

  return {
    ...mutation,
    hasPermission: allowed,
    hasSession: Boolean(session),
    session,
    tenantId
  };
}
