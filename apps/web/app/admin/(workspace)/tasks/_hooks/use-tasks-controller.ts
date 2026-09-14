"use client";

import { useMemo, useState } from "react";
import {
  allTasksColumns,
  defaultTaskBoardSettings,
  type TasksTableColumn
} from "../_components/task-list-types";
import { useTaskBoardState } from "./use-task-board-state";
import { useTaskWriteAheadLog } from "./use-task-write-ahead-log";
import { useTasksData } from "./use-tasks-data";
import { useTasksMetrics } from "./use-tasks-metrics";
import { useTasksPagination } from "./use-tasks-pagination";
import { useTasksPermissions } from "./use-tasks-permissions";
import { useTasksQueryParams } from "./use-tasks-query-params";
import { useTasksTableSync } from "./use-tasks-table-sync";
import { useTasksViewMode } from "./use-tasks-view-mode";

export function useTasksController() {
  const { setViewMode, viewMode } = useTasksViewMode();
  const [pendingTableRefresh, setPendingTableRefresh] = useState(false);
  const pagination = useTasksPagination();
  const boardState = useTaskBoardState({
    resetPagination: pagination.resetPagination,
    setViewMode
  });
  const queryParams = useTasksQueryParams({
    boardSettings: boardState.boardSettings,
    currentCursor: pagination.currentCursor,
    filters: boardState.filters,
    viewMode
  });
  const taskData = useTasksData(queryParams, viewMode);
  const permissions = useTasksPermissions(taskData.tasksQuery.session);
  const columns = useMemo<TasksTableColumn[]>(() => {
    return allTasksColumns.filter(
      (column) => column === "name" || boardState.boardSettings.visibleProperties.includes(column)
    );
  }, [boardState.boardSettings.visibleProperties]);
  const writeAheadLog = useTaskWriteAheadLog({
    canUpdate: permissions.canUpdate,
    remoteTasks: taskData.remoteTasks
  });
  const tableSync = useTasksTableSync({
    flushTaskBuffer: writeAheadLog.flushTaskBuffer,
    pendingTableRefresh,
    setPendingTableRefresh,
    viewMode
  });
  const taskMetrics = useTasksMetrics({
    hasBufferedTaskChanges: writeAheadLog.hasBufferedTaskChanges,
    metrics: taskData.metricsQuery.data,
    remoteTasks: taskData.remoteTasks,
    taskBuffer: writeAheadLog.taskBuffer,
    tasks: writeAheadLog.tasks,
    tasksData: taskData.tasksQuery.data
  });

  function updateViewMode(nextViewMode: typeof viewMode) {
    pagination.resetPagination();

    if (viewMode === "kanban" && nextViewMode === "table") {
      tableSync.markTableSyncing();
    }

    if (viewMode === "table" && nextViewMode === "kanban") {
      boardState.updateBoardSettings({ viewMode: defaultTaskBoardSettings.viewMode });
    }

    setViewMode(nextViewMode);
  }

  return {
    activeBoardId: boardState.activeBoardId,
    assignees: taskData.assignees,
    boardMutationError: boardState.boardMutationError,
    boardName: boardState.boardName,
    boardSettings: boardState.boardSettings,
    boardsQuery: boardState.boardsQuery,
    bufferedTaskChangesCount: writeAheadLog.bufferedTaskChangesCount,
    canCreate: permissions.canCreate,
    canDelete: permissions.canDelete,
    canUpdate: permissions.canUpdate,
    columns,
    cursorStack: pagination.cursorStack,
    deleteActiveBoard: boardState.deleteActiveBoard,
    filters: boardState.filters,
    flushBatchSize: writeAheadLog.flushBatchSize,
    fetchNextTasksPage: taskData.fetchNextTasksPage,
    goBack: pagination.goBack,
    goForward: () => pagination.goForward(taskData.pageInfo?.nextCursor),
    hasNextTasksPage: taskData.hasNextTasksPage,
    hasBufferedTaskChanges: writeAheadLog.hasBufferedTaskChanges,
    isFetchingNextTasksPage: taskData.isFetchingNextTasksPage,
    isTasksSyncing: tableSync.isTasksSyncing,
    maxBufferedChanges: writeAheadLog.maxBufferedChanges,
    metricsQuery: taskData.metricsQuery,
    moveTaskInBuffer: writeAheadLog.moveTaskInBuffer,
    pageInfo: taskData.pageInfo,
    saveBoard: boardState.saveBoard,
    savingBoard: boardState.savingBoard,
    selectBoard: boardState.selectBoard,
    taskBuffer: writeAheadLog.taskBuffer,
    taskMetrics,
    taskStatusMutation: writeAheadLog.taskStatusMutation,
    tasks: writeAheadLog.tasks,
    tasksQuery: taskData.tasksQuery,
    updateBoardName: boardState.updateBoardName,
    updateBoardSettings: boardState.updateBoardSettings,
    updateFilters: boardState.updateFilters,
    updateViewMode,
    viewMode
  };
}

export type TasksController = ReturnType<typeof useTasksController>;
