"use client";

import { ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTableHeader } from "../../../_components/admin-table-header";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import { TasksTablePagination } from "../../../cases/_components/detail/tasks-table/pagination";
import { useTasksContext } from "../../_context/tasks-context";
import { TasksToolbar } from "../layout/tasks-toolbar";
import { TasksMetrics } from "../metrics/tasks-metrics";
import { TasksTable } from "../table/tasks-table";

export function TasksTableView() {
  const {
    assignees,
    canDelete,
    canUpdate,
    columns,
    cursorStack,
    goBack,
    goForward,
    isTasksSyncing,
    metricsQuery,
    pageInfo,
    taskMetrics,
    tasks,
    tasksQuery
  } = useTasksContext();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
      <TasksMetrics isLoading={metricsQuery.isLoading || isTasksSyncing} metrics={taskMetrics} />

      <Card
        data-admin-surface
        className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
      >
        <AdminTableHeader actions={<TasksToolbar />} icon={ListTodo} title="Tareas" />
        <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-4">
          <TasksTable
            assignees={assignees}
            canDelete={canDelete}
            canUpdate={canUpdate}
            columns={columns}
            error={tasksQuery.error}
            isLoading={tasksQuery.isLoading || isTasksSyncing}
            tasks={tasks}
          />
          <TasksTablePagination
            canGoBack={cursorStack.length > 0}
            canGoForward={Boolean(pageInfo?.hasNextPage && pageInfo.nextCursor)}
            goBack={goBack}
            goForward={goForward}
            pageIndex={cursorStack.length}
            taskCount={tasks.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}
