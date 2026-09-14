"use client";

import { useTasksContext } from "../../_context/tasks-context";
import { TasksKanbanBoard } from "../kanban/tasks-kanban-board";
import { TasksTable } from "../table/tasks-table";
import { TasksBoardCalendar } from "./calendar/tasks-board-calendar";
import { TasksBoardChartView } from "./charts/tasks-board-chart-view";

export function TasksBoardContent() {
  const { assignees, boardSettings, canCreate, canDelete, canUpdate, columns, tasks, tasksQuery } =
    useTasksContext();

  if (boardSettings.viewMode === "table") {
    return (
      <TasksTable
        assignees={assignees}
        canDelete={canDelete}
        canUpdate={canUpdate}
        columns={columns}
        error={tasksQuery.error}
        isLoading={tasksQuery.isLoading}
        tasks={tasks}
      />
    );
  }

  if (boardSettings.viewMode === "calendar") {
    return (
      <TasksBoardCalendar error={tasksQuery.error} isLoading={tasksQuery.isLoading} tasks={tasks} />
    );
  }

  if (boardSettings.viewMode === "bar_chart") {
    return (
      <TasksBoardChartView
        assignees={assignees}
        chartGroupBy={boardSettings.chartGroupBy}
        chartShowHorizontalLines={boardSettings.chartShowHorizontalLines}
        chartSortBy={boardSettings.chartSortBy}
        chartSortDirection={boardSettings.chartSortDirection}
        chartType={boardSettings.chartType}
        canCreate={canCreate}
        error={tasksQuery.error}
        hideZeroValues={boardSettings.hideZeroValues}
        isLoading={tasksQuery.isLoading}
        tasks={tasks}
      />
    );
  }

  return <TasksKanbanBoard />;
}
