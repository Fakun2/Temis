import type { TaskBoardVisibleProperty } from "../../cases/_types/cases.types";
import type { TaskBoardSettings, TaskFilters, TasksTableColumn } from "../_types/task-list.types";

export const tasksPageSize = 8;
export const tasksKanbanPageSize = 50;
export const allFilterValue = "__all__";

export const allTasksColumns = [
  "name",
  "case",
  "client",
  "assignedTo",
  "endDate",
  "status"
] as const;

export const defaultTasksColumns: TasksTableColumn[] = [
  "name",
  "case",
  "client",
  "assignedTo",
  "endDate",
  "status"
];

export const emptyTaskFilters: TaskFilters = {
  assignedMembershipId: "",
  caseId: "",
  caseLabel: "",
  clientId: "",
  clientLabel: "",
  dueStatus: "",
  endDateFrom: "",
  endDateTo: "",
  practiceAreaId: "",
  search: "",
  status: ""
};

export const defaultTaskBoardVisibleProperties: TaskBoardVisibleProperty[] = [
  "case",
  "client",
  "assignedTo",
  "endDate",
  "status"
];

export const defaultTaskBoardSettings: TaskBoardSettings = {
  chartGroupBy: "status",
  chartShowHorizontalLines: true,
  chartSortBy: "count",
  chartSortDirection: "desc",
  chartType: "vertical_bar",
  hideZeroValues: false,
  kanbanCardLayout: "compact",
  kanbanCardSize: "medium",
  kanbanColorColumns: true,
  openTaskIn: "side_sheet",
  sortBy: "createdAt",
  sortDirection: "desc",
  viewMode: "kanban",
  visibleProperties: defaultTaskBoardVisibleProperties
};
