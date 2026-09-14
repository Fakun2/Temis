"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getActiveTenantAccess, hasPermission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/use-session";
import { caseKeys, listTenantCaseTasks } from "../../cases/_api/cases.api";
import type {
  TenantCaseTasksListResponse,
  TenantCaseTasksQueryParams
} from "../../cases/_types/cases.types";

export function useTasksInfiniteData({
  enabled,
  queryParams
}: {
  enabled: boolean;
  queryParams: TenantCaseTasksQueryParams;
}) {
  const session = useSession();
  const tenantAccess = useMemo(() => getActiveTenantAccess(session), [session]);
  const tenantId = tenantAccess?.tenantId ?? null;
  const allowed = hasPermission(session, "tasks:read");
  const paramsWithoutCursor = useMemo(
    () => ({ ...queryParams, cursor: undefined, offset: undefined }),
    [queryParams]
  );
  const query = useInfiniteQuery<TenantCaseTasksListResponse, Error>({
    enabled: Boolean(enabled && session && tenantId && allowed),
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      listTenantCaseTasks({
        ...paramsWithoutCursor,
        cursor: typeof pageParam === "string" ? pageParam : undefined
      }),
    queryKey: [tenantId, ...caseKeys.tenantTasks(paramsWithoutCursor), "infinite"]
  });

  return {
    ...query,
    hasPermission: allowed,
    hasSession: Boolean(session),
    session,
    tenantId
  };
}
