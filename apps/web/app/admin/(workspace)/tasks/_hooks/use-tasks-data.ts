"use client";

import { useMemo } from "react";
import { casesQueries } from "../../cases/_api/cases.query-controller";
import { useCasesQuery } from "../../cases/_hooks/use-cases-query";
import type {
  TenantCaseTasksListResponse,
  TenantCaseTasksQueryParams
} from "../../cases/_types/cases.types";
import { tasksKanbanPageSize } from "../_components/task-list-types";
import type { TasksViewMode } from "../_components/task-list-types";
import { useTasksInfiniteData } from "./use-tasks-infinite-data";

export function useTasksData(queryParams: TenantCaseTasksQueryParams, viewMode: TasksViewMode) {
  const tableQueryParams = useMemo(
    () => ({
      ...queryParams,
      limit: queryParams.limit
    }),
    [queryParams]
  );
  const kanbanQueryParams = useMemo(
    () => ({
      ...queryParams,
      cursor: undefined,
      offset: undefined,
      limit: tasksKanbanPageSize
    }),
    [queryParams]
  );
  const tableTasksQuery = useCasesQuery({
    ...casesQueries.tenantTasks(tableQueryParams),
    enabled: viewMode === "table"
  });
  const kanbanTasksQuery = useTasksInfiniteData({
    enabled: viewMode === "kanban",
    queryParams: kanbanQueryParams
  });
  const metricsQuery = useCasesQuery(casesQueries.tenantTaskMetrics());
  const assigneesQuery = useCasesQuery(casesQueries.taskAssignees());
  const kanbanTasksData = useMemo<TenantCaseTasksListResponse | undefined>(() => {
    const pages = kanbanTasksQuery.data?.pages;

    if (!pages?.length) {
      return undefined;
    }

    const lastPage = pages.at(-1)!;

    return {
      items: pages.flatMap((page) => page.items),
      pageInfo: lastPage.pageInfo
    };
  }, [kanbanTasksQuery.data?.pages]);
  const tableTasksData = isTenantTasksListResponse(tableTasksQuery.data)
    ? tableTasksQuery.data
    : undefined;
  const tasksData = viewMode === "kanban" ? kanbanTasksData : tableTasksData;
  const tasksQuery =
    viewMode === "kanban" ? { ...kanbanTasksQuery, data: kanbanTasksData } : tableTasksQuery;
  const remoteTasks = useMemo(() => tasksData?.items ?? [], [tasksData?.items]);

  return {
    assignees: assigneesQuery.data ?? [],
    fetchNextTasksPage: kanbanTasksQuery.fetchNextPage,
    hasNextTasksPage: Boolean(kanbanTasksQuery.hasNextPage),
    isFetchingNextTasksPage: kanbanTasksQuery.isFetchingNextPage,
    metricsQuery,
    pageInfo: tasksData?.pageInfo,
    remoteTasks,
    tasksQuery
  };
}

function isTenantTasksListResponse(
  value: unknown
): value is TenantCaseTasksListResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as TenantCaseTasksListResponse).items) &&
    typeof (value as TenantCaseTasksListResponse).pageInfo === "object" &&
    (value as TenantCaseTasksListResponse).pageInfo !== null
  );
}
