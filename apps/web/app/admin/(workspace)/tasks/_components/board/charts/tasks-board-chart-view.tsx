"use client";

import { BarChart3 } from "lucide-react";
import type { GlobalCaseTaskDto, TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import type {
  TasksBoardChartGroupBy,
  TasksBoardChartSortBy,
  TasksBoardChartType
} from "../../task-list-types";
import { BoardMessage } from "../shared/board-message";
import { getAxisMax, getAxisTicks, getTasksChartData, sortTasksChartData } from "./chart-utils";
import { TasksHorizontalBarChart } from "./tasks-horizontal-bar-chart";
import { TasksLineChart } from "./tasks-line-chart";
import { TasksPieChart } from "./tasks-pie-chart";
import { TasksVerticalBarChart } from "./tasks-vertical-bar-chart";

export function TasksBoardChartView({
  assignees,
  canCreate,
  chartGroupBy,
  chartShowHorizontalLines,
  chartSortBy,
  chartSortDirection,
  chartType,
  error,
  hideZeroValues,
  isLoading,
  tasks
}: {
  assignees: TaskAssigneeOption[];
  canCreate: boolean;
  chartGroupBy: TasksBoardChartGroupBy;
  chartShowHorizontalLines: boolean;
  chartSortBy: TasksBoardChartSortBy;
  chartSortDirection: "asc" | "desc";
  chartType: TasksBoardChartType;
  error: Error | null;
  hideZeroValues: boolean;
  isLoading: boolean;
  tasks: GlobalCaseTaskDto[];
}) {
  if (!isLoading && error) {
    return <BoardMessage message={error.message} tone="error" />;
  }

  const allData =
    isLoading && tasks.length === 0 ? getTasksChartData([], "status") : getTasksChartData(tasks, chartGroupBy);
  const visibleData = hideZeroValues && !isLoading ? allData.filter((item) => item.count > 0) : allData;
  const data = sortTasksChartData(visibleData, chartSortBy, chartSortDirection);
  const maxCount = Math.max(1, ...data.map((item) => item.count));
  const axisMax = getAxisMax(maxCount);
  const ticks = getAxisTicks(axisMax);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background/60 p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Tareas por estado</h3>
        </div>
        <span className="text-xs text-muted-foreground">{tasks.length} tareas</span>
      </div>

      {!isLoading && data.length === 0 ? (
        <BoardMessage message="No hay valores para mostrar con la configuracion actual." />
      ) : null}
      {chartType === "horizontal_bar" && (isLoading || data.length > 0) ? (
        <TasksHorizontalBarChart
          assignees={assignees}
          axisMax={axisMax}
          canCreate={canCreate}
          data={data}
          isLoading={isLoading}
          showGridLines={chartShowHorizontalLines}
          ticks={ticks}
        />
      ) : null}
      {chartType === "line" && (isLoading || data.length > 0) ? (
        <TasksLineChart
          assignees={assignees}
          axisMax={axisMax}
          canCreate={canCreate}
          data={data}
          isLoading={isLoading}
          showGridLines={chartShowHorizontalLines}
          ticks={ticks}
        />
      ) : null}
      {chartType === "pie" && (isLoading || data.length > 0) ? (
        <TasksPieChart assignees={assignees} canCreate={canCreate} data={data} isLoading={isLoading} />
      ) : null}
      {chartType === "vertical_bar" && (isLoading || data.length > 0) ? (
        <TasksVerticalBarChart
          assignees={assignees}
          axisMax={axisMax}
          canCreate={canCreate}
          data={data}
          isLoading={isLoading}
          showGridLines={chartShowHorizontalLines}
          ticks={ticks}
        />
      ) : null}
    </div>
  );
}
