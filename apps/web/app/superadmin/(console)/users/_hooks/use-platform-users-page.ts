"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import {
  getPlatformDashboardSummary,
  listPlatformUsers,
  type PlatformUsersQuery
} from "../../_api/platform.api";

const pageSize = 20;

export function usePlatformUsersPage() {
  const session = useSuperAdminSession();
  const allowed = hasSuperAdminPermission(session, "platform:users:read");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlatformUsersQuery["status"]>();
  const [sortBy, setSortBy] = useState<NonNullable<PlatformUsersQuery["sortBy"]>>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<NonNullable<PlatformUsersQuery["sortDirection"]>>("desc");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const cursor = cursorStack.at(-1);
  const params = { cursor, limit: pageSize, search, sortBy, sortDirection, status };
  const usersQuery = useQuery({
    enabled: allowed,
    queryFn: () => listPlatformUsers(params),
    queryKey: ["platform", "users", params]
  });
  const summaryQuery = useQuery({
    enabled: allowed,
    queryFn: getPlatformDashboardSummary,
    queryKey: ["platform", "dashboard", "summary"]
  });
  const resetPages = () => setCursorStack([]);

  function updateSearch(value: string) {
    setSearch(value);
    resetPages();
  }
  function updateStatus(value: PlatformUsersQuery["status"]) {
    setStatus(value);
    resetPages();
  }
  function clearFilters() {
    setSearch("");
    setStatus(undefined);
    resetPages();
  }
  function changeSort(next: NonNullable<PlatformUsersQuery["sortBy"]>) {
    if (next === sortBy) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortBy(next);
      setSortDirection(next === "createdAt" || next === "lastLoginAt" ? "desc" : "asc");
    }
    resetPages();
  }
  function nextPage() {
    const nextCursor = usersQuery.data?.pageInfo.nextCursor;
    if (nextCursor) setCursorStack((items) => [...items, nextCursor]);
  }

  return {
    clearFilters,
    hasActiveFilters: Boolean(search.trim() || status),
    nextPage,
    pageIndex: cursorStack.length,
    previousPage: () => setCursorStack((items) => items.slice(0, -1)),
    refresh: () => void usersQuery.refetch(),
    search,
    sortBy,
    sortDirection,
    status,
    summaryQuery,
    updateSearch,
    updateStatus,
    usersQuery,
    changeSort
  };
}
