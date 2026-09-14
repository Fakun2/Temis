"use client";

import { useMemo } from "react";
import type { TenantCaseTasksQueryParams } from "../../cases/_types/cases.types";
import {
  tasksKanbanPageSize,
  tasksPageSize,
  type TaskBoardSettings,
  type TaskFilters,
  type TasksViewMode
} from "../_components/task-list-types";

export function useTasksQueryParams({
  boardSettings,
  currentCursor,
  filters,
  viewMode
}: {
  boardSettings: TaskBoardSettings;
  currentCursor?: string;
  filters: TaskFilters;
  viewMode: TasksViewMode;
}) {
  return useMemo<TenantCaseTasksQueryParams>(
    () => ({
      assignedMembershipId: filters.assignedMembershipId || undefined,
      caseId: filters.caseId || undefined,
      clientId: filters.clientId || undefined,
      cursor: viewMode === "table" ? currentCursor : undefined,
      dueStatus: filters.dueStatus || undefined,
      endDateFrom: filters.endDateFrom || undefined,
      endDateTo: filters.endDateTo || undefined,
      limit: viewMode === "kanban" ? tasksKanbanPageSize : tasksPageSize,
      practiceAreaId: filters.practiceAreaId || undefined,
      search: filters.search || undefined,
      sortBy: boardSettings.sortBy,
      sortDirection: boardSettings.sortDirection,
      status: filters.status || undefined
    }),
    [boardSettings.sortBy, boardSettings.sortDirection, currentCursor, filters, viewMode]
  );
}
