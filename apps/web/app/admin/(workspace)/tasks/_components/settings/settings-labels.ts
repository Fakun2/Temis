import type { TaskBoardVisibleProperty } from "../../../cases/_types/cases.types";
import {
  taskBoardPropertyLabels,
  taskBoardSortLabels,
  type TasksBoardChartGroupBy,
  type TasksBoardChartSortBy,
  type TasksBoardViewModeOption,
  type TasksKanbanCardSize,
  type TasksOpenTaskMode
} from "../task-list-types";
import { chartGroupOptions, chartSortOptions } from "./settings-options";

export function getPropertyLabel(property: TaskBoardVisibleProperty | "name") {
  return property === "name" ? "Tarea" : taskBoardPropertyLabels[property];
}

export function getOpenTaskInLabel(openTaskIn: TasksOpenTaskMode) {
  return openTaskIn === "center_modal" ? "Ventana central" : "Ventana lateral";
}

export function getKanbanCardSizeLabel(size: TasksKanbanCardSize) {
  if (size === "small") {
    return "Pequeño";
  }

  if (size === "large") {
    return "Grande";
  }

  return "Mediano";
}

export function getChartGroupLabel(groupBy: TasksBoardChartGroupBy) {
  return chartGroupOptions.find((option) => option.value === groupBy)?.label ?? "Estado";
}

export function getChartSortLabel(sortBy: TasksBoardChartSortBy) {
  return chartSortOptions.find((option) => option.value === sortBy)?.label ?? "Recuento";
}

export function getChartSortDirectionLabel(sortBy: TasksBoardChartSortBy, direction: "asc" | "desc") {
  if (sortBy === "label") {
    return direction === "asc" ? "A -> Z" : "Z -> A";
  }

  return direction === "asc" ? "Bajo -> Alto" : "Alto -> Bajo";
}

export function getViewLabel(viewMode: TasksBoardViewModeOption) {
  if (viewMode === "table") {
    return "Tabla";
  }

  if (viewMode === "calendar") {
    return "Calendario";
  }

  if (viewMode === "bar_chart") {
    return "Grafico";
  }

  return "Tablero";
}

export { taskBoardSortLabels };
