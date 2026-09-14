"use client";

import { useMemo } from "react";
import type {
  TenantCaseTasksListResponse,
  TenantCaseTasksMetricsDto
} from "../../cases/_types/cases.types";
import { applyMetricsMove, calculateTasksMetrics } from "../_utils/task-kanban";
import type { TaskMovePatch } from "../_utils/task-kanban";

export function useTasksMetrics({
  hasBufferedTaskChanges,
  metrics,
  remoteTasks,
  taskBuffer,
  tasks,
  tasksData
}: {
  hasBufferedTaskChanges: boolean;
  metrics?: TenantCaseTasksMetricsDto;
  remoteTasks: TenantCaseTasksListResponse["items"];
  taskBuffer: Record<string, TaskMovePatch>;
  tasks: TenantCaseTasksListResponse["items"];
  tasksData?: TenantCaseTasksListResponse;
}) {
  return useMemo(() => {
    if (tasksData?.pageInfo && tasks.length === tasksData.pageInfo.total) {
      return calculateTasksMetrics(tasks);
    }

    if (!metrics || !hasBufferedTaskChanges) {
      return metrics;
    }

    const remoteTaskById = new Map(remoteTasks.map((task) => [task.id, task]));

    return Object.entries(taskBuffer).reduce((nextMetrics, [taskId, patch]) => {
      const task = remoteTaskById.get(taskId);

      return task ? applyMetricsMove(nextMetrics, task, patch) : nextMetrics;
    }, metrics);
  }, [hasBufferedTaskChanges, metrics, remoteTasks, taskBuffer, tasks, tasksData]);
}
