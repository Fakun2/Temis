"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { saveCaseTask, saveTenantCaseTask } from "../../cases/_api/cases.api";
import type {
  CaseTaskStatus,
  GlobalCaseTaskDto,
  TenantCaseTasksListResponse,
  TenantCaseTasksMetricsDto
} from "../../cases/_types/cases.types";
import {
  applyMetricsMove,
  getTaskMovePatch,
  hasTaskMoveChanges,
  toTaskFormValues,
  type TaskMovePatch
} from "../_utils/task-kanban";
import {
  isTenantTaskListQuery,
  isTenantTaskMetricsQuery,
  isTenantTasksDataQuery
} from "../_utils/tasks-query-cache";

type MoveTaskContext = {
  metricsSnapshots: Array<[QueryKey, TenantCaseTasksMetricsDto | undefined]>;
  taskSnapshots: Array<[QueryKey, TenantCaseTasksListResponse | undefined]>;
};

export function useTaskStatusMutation() {
  const queryClient = useQueryClient();

  const mutation = useDashboardMutation<
    unknown,
    { patch: TaskMovePatch; task: GlobalCaseTaskDto }
  >({
    permission: "tasks:update",
    mutationFn: ({ patch, task }) =>
      task.caseId
        ? saveCaseTask({ caseId: task.caseId, input: toTaskFormValues(task, patch), taskId: task.id })
        : saveTenantCaseTask({ input: toTaskFormValues(task, patch), taskId: task.id }),
    onMutate: async ({ patch, task }) => {
      await queryClient.cancelQueries({ predicate: isTenantTasksDataQuery });
      const taskSnapshots = queryClient.getQueriesData<TenantCaseTasksListResponse>({
        predicate: isTenantTaskListQuery
      });
      const metricsSnapshots = queryClient.getQueriesData<TenantCaseTasksMetricsDto>({
        predicate: isTenantTaskMetricsQuery
      });

      for (const [queryKey, current] of taskSnapshots) {
        if (!current) {
          continue;
        }

        queryClient.setQueryData<TenantCaseTasksListResponse>(queryKey, {
          ...current,
          items: current.items.map((item) => (item.id === task.id ? { ...item, ...patch } : item))
        });
      }

      for (const [queryKey, current] of metricsSnapshots) {
        if (!current) {
          continue;
        }

        queryClient.setQueryData<TenantCaseTasksMetricsDto>(
          queryKey,
          applyMetricsMove(current, task, patch)
        );
      }

      return { metricsSnapshots, taskSnapshots };
    },
    onError: (_error, _variables, context) => {
      const rollback = context as MoveTaskContext | undefined;

      for (const [queryKey, data] of rollback?.taskSnapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }

      for (const [queryKey, data] of rollback?.metricsSnapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    }
  });

  async function saveTaskPatch(task: GlobalCaseTaskDto, patch: TaskMovePatch) {
    if (!hasTaskMoveChanges(task, patch)) {
      return;
    }

    await mutation.mutateAsync({ patch, task });
  }

  async function moveTask(task: GlobalCaseTaskDto, status: CaseTaskStatus) {
    await saveTaskPatch(task, getTaskMovePatch(task, status));
  }

  return {
    ...mutation,
    moveTask,
    saveTaskPatch
  };
}
