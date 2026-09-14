"use client";

import type { GlobalCaseTaskDto } from "../../../../cases/_types/cases.types";
import { groupTasksByColumn, kanbanColumns, type KanbanColumn } from "../../../_utils/task-kanban";
import type { TasksBoardChartGroupBy, TasksBoardChartSortBy } from "../../task-list-types";

export type TasksChartDatum = {
  id: string;
  status: KanbanColumn["status"];
  title: string;
  toneKey: KanbanColumn["id"] | "default";
  count: number;
  tasks: GlobalCaseTaskDto[];
};

export function getTasksChartData(
  tasks: GlobalCaseTaskDto[],
  groupBy: TasksBoardChartGroupBy
): TasksChartDatum[] {
  if (groupBy !== "status") {
    return groupTasksByField(tasks, groupBy);
  }

  const groupedTasks = groupTasksByColumn(tasks);

  return kanbanColumns.map((column) => ({
    id: column.id,
    status: column.status,
    title: column.title,
    toneKey: column.id,
    count: groupedTasks[column.id].length,
    tasks: groupedTasks[column.id]
  }));
}

export function sortTasksChartData(
  data: TasksChartDatum[],
  sortBy: TasksBoardChartSortBy,
  sortDirection: "asc" | "desc"
) {
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...data].sort((first, second) => {
    if (sortBy === "label") {
      return first.title.localeCompare(second.title, "es") * direction;
    }

    return (first.count - second.count) * direction || first.title.localeCompare(second.title, "es");
  });
}

export function getAxisMax(maxCount: number) {
  if (maxCount <= 5) return 5;
  if (maxCount <= 10) return 10;
  return Math.ceil(maxCount / 10) * 10;
}

export function getAxisTicks(axisMax: number) {
  const step = Math.max(1, Math.ceil(axisMax / 4));
  const ticks = [0, step, step * 2, step * 3, axisMax];
  return Array.from(new Set(ticks)).sort((a, b) => b - a);
}

export function getChartTone(toneKey: TasksChartDatum["toneKey"]) {
  const isTodo = toneKey === "todo";

  return {
    barClassName: isTodo
      ? "bg-[#8b8b86] group-hover:bg-[#73736e] dark:bg-[#5a5a55] dark:group-hover:bg-[#6b6b65]"
      : "bg-primary/90 group-hover:bg-primary dark:bg-primary/80 dark:group-hover:bg-primary",
    markerClassName: isTodo ? "bg-[#8b8b86] dark:bg-[#6b6b65]" : "bg-primary",
    solidColor: isTodo ? "#8b8b86" : "hsl(var(--primary))"
  };
}

export function getPercent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export function getValuePercent(count: number, axisMax: number) {
  return Math.max(count === 0 ? 2 : 8, (count / axisMax) * 100);
}

function groupTasksByField(
  tasks: GlobalCaseTaskDto[],
  groupBy: Exclude<TasksBoardChartGroupBy, "status">
): TasksChartDatum[] {
  const groups = new Map<string, TasksChartDatum>();

  for (const task of tasks) {
    const group = getTaskGroup(task, groupBy);
    const current = groups.get(group.id);

    if (current) {
      current.count += 1;
      current.tasks.push(task);
      continue;
    }

    groups.set(group.id, {
      ...group,
      count: 1,
      tasks: [task]
    });
  }

  return Array.from(groups.values());
}

function getTaskGroup(
  task: GlobalCaseTaskDto,
  groupBy: Exclude<TasksBoardChartGroupBy, "status">
): Pick<TasksChartDatum, "id" | "status" | "title" | "toneKey"> {
  if (groupBy === "client") {
    return {
      id: task.client?.id ?? "__without_client__",
      status: null,
      title: task.client?.displayName ?? "Sin cliente",
      toneKey: "default"
    };
  }

  if (groupBy === "case") {
    return {
      id: task.case?.id ?? "__without_case__",
      status: null,
      title: task.case ? task.case.caseNumber || task.case.caption : "Sin expediente",
      toneKey: "default"
    };
  }

  return {
    id: task.assignedTo?.id ?? "__without_assignee__",
    status: null,
    title: task.assignedTo?.fullName ?? "Sin asignar",
    toneKey: "default"
  };
}
