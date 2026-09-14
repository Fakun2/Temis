import type {
  TaskBoardSortKey,
  TaskBoardVisibleProperty
} from "../../../cases/_types/cases.types";
import type {
  TasksBoardChartGroupBy,
  TasksBoardChartSortBy,
  TasksBoardChartType,
  TasksBoardViewModeOption,
  TasksKanbanCardLayout,
  TasksKanbanCardSize,
  TasksOpenTaskMode
} from "../task-list-types";

export type TasksSettingsScreen =
  | "home"
  | "design"
  | "visibility"
  | "sort"
  | "chart-group"
  | "chart-sort"
  | "open-task"
  | "card-size";

export type TasksBoardViewOption = {
  label: string;
  value: TasksBoardViewModeOption;
};

export type TasksChartTypeOption = {
  label: string;
  value: TasksBoardChartType;
};

export type TasksChartGroupOption = {
  label: string;
  value: TasksBoardChartGroupBy;
};

export type TasksChartSortOption = {
  label: string;
  value: TasksBoardChartSortBy;
};

export type TasksOpenTaskOption = {
  label: string;
  value: TasksOpenTaskMode;
};

export type TasksKanbanCardSizeOption = {
  label: string;
  value: TasksKanbanCardSize;
};

export type TasksVisiblePropertyOption = {
  value: TaskBoardVisibleProperty | "name";
};

export type TasksSortOption = {
  value: TaskBoardSortKey;
};

export type { TasksKanbanCardLayout };
