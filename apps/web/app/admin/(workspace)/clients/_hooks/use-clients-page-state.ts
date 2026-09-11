"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientStatus, ClientType, ClientsControllerListParams } from "@temis/api-client";
import { clientsPageSize } from "../_constants/clients.constants";

export type ClientTypeFilter = ClientType | "all";
export type ClientStatusFilter = ClientStatus | "operational";

export function useClientsPageState() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [, setCursorStack] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ClientTypeFilter>("all");
  const [status, setStatus] = useState<ClientStatusFilter>("operational");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCursor(null);
      setCursorStack([]);
      setPageIndex(0);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const queryParams = useMemo<ClientsControllerListParams>(
    () => ({
      cursor: cursor ?? undefined,
      limit: clientsPageSize,
      order: "asc",
      search: debouncedSearch || undefined,
      sort: "name",
      status: status === "operational" ? undefined : status,
      type: type === "all" ? undefined : type
    }),
    [cursor, debouncedSearch, status, type]
  );

  const hasActiveFilters = Boolean(search.trim()) || type !== "all" || status !== "operational";

  function resetPagination() {
    setCursor(null);
    setCursorStack([]);
    setPageIndex(0);
  }

  function updateType(nextType: ClientTypeFilter) {
    setType(nextType);
    resetPagination();
  }

  function updateStatus(nextStatus: ClientStatusFilter) {
    setStatus(nextStatus);
    resetPagination();
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setType("all");
    setStatus("operational");
    resetPagination();
  }

  function nextPage(nextCursor: string) {
    setCursorStack((current) => [...current, cursor ?? ""]);
    setCursor(nextCursor);
    setPageIndex((current) => current + 1);
  }

  function previousPage() {
    setCursorStack((current) => {
      const previousCursor = current.at(-1) ?? null;
      setCursor(previousCursor === "" ? null : previousCursor);
      return current.slice(0, -1);
    });
    setPageIndex((current) => Math.max(0, current - 1));
  }

  return {
    hasActiveFilters,
    pageIndex,
    queryParams,
    search,
    status,
    type,
    clearFilters,
    nextPage,
    previousPage,
    resetPagination,
    setSearch,
    updateStatus,
    updateType
  };
}
