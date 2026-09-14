"use client";

import { UnauthorizedState } from "@/components/ui/not-found";
import { RequirePermission } from "../_components/auth";
import { TasksProvider, useTasksContext } from "./_context/tasks-context";
import { TasksViewTransition } from "./_components/layout/tasks-view-transition";
import { TasksKanbanView } from "./_components/views/tasks-kanban-view";
import { TasksTableView } from "./_components/views/tasks-table-view";

export default function TasksPage() {
  return (
    <RequirePermission permissions={["tasks:read"]} fallback={<RestrictedTasks />}>
      <TasksProvider>
        <TasksView />
      </TasksProvider>
    </RequirePermission>
  );
}

function TasksView() {
  const { viewMode } = useTasksContext();

  return (
    <TasksViewTransition viewMode={viewMode}>
      {viewMode === "kanban" ? <TasksKanbanView /> : <TasksTableView />}
    </TasksViewTransition>
  );
}

function RestrictedTasks() {
  return (
    <UnauthorizedState
      title="Tareas restringidas"
      description="Necesitas permisos adicionales para acceder a las tareas del estudio."
    />
  );
}
