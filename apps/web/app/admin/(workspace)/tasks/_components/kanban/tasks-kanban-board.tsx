"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { useTasksContext } from "../../_context/tasks-context";
import {
  groupTasksByColumn,
  kanbanColumns,
  type KanbanColumn
} from "../../_utils/task-kanban";
import { TaskKanbanColumn } from "./task-kanban-column";
import { TasksKanbanLoadMore } from "./tasks-kanban-load-more";

export function TasksKanbanBoard() {
  const {
    assignees,
    canCreate,
    canDelete,
    canUpdate,
    boardSettings,
    fetchNextTasksPage,
    hasNextTasksPage,
    isFetchingNextTasksPage,
    moveTaskInBuffer,
    taskStatusMutation,
    tasks,
    tasksQuery
  } = useTasksContext();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const groupedTasks = useMemo(() => groupTasksByColumn(tasks), [tasks]);
  const message = !tasksQuery.isLoading && tasksQuery.error && !tasks.length
    ? tasksQuery.error.message
    : !tasksQuery.isLoading && !tasks.length
      ? "Todavia no hay tareas para los filtros seleccionados."
      : null;

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, column: KanbanColumn) {
    if (!column.status || !canUpdate) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, column: KanbanColumn) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const task = tasks.find((item) => item.id === taskId);
    setDraggedTaskId(null);

    if (!task || !column.status || !canUpdate) {
      return;
    }

    moveTaskInBuffer(task, column.status);
  }

  const loadNextPage = useCallback(() => {
    if (!hasNextTasksPage || isFetchingNextTasksPage) {
      return;
    }

    void fetchNextTasksPage();
  }, [fetchNextTasksPage, hasNextTasksPage, isFetchingNextTasksPage]);

  if (message) {
    return (
      <div
        className={`flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border/40 px-6 py-8 text-center text-sm ${
          tasksQuery.error ? "font-medium text-destructive" : "text-muted-foreground"
        }`}
      >
        {message}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden">
      {taskStatusMutation.error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
          {taskStatusMutation.error.message}
        </div>
      ) : null}

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto pb-3 scrollbar-none">
        <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col items-start gap-3">
          {kanbanColumns.map((column) => (
            <TaskKanbanColumn
              assignees={assignees}
              canCreate={canCreate}
              canDelete={canDelete}
              canUpdate={canUpdate}
              column={column}
              isLoading={tasksQuery.isLoading}
              isMoving={taskStatusMutation.isPending}
              key={column.id}
              onDragEnd={() => setDraggedTaskId(null)}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              tasks={groupedTasks[column.id]}
              visibleProperties={boardSettings.visibleProperties}
            />
          ))}
        </div>
        <TasksKanbanLoadMore
          canLoadMore={hasNextTasksPage}
          isLoading={isFetchingNextTasksPage}
          onLoadMore={loadNextPage}
          rootRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
