import type {
  CaseTaskStatus,
  TaskBoardSettingsDto,
  TenantCaseTasksDueStatus
} from "../../cases/_types/cases.types";

export type TasksTableColumn = "name" | "case" | "client" | "assignedTo" | "endDate" | "status";
export type TasksViewMode = "table" | "kanban";
export type TasksBoardViewModeOption = "table" | "kanban" | "calendar" | "bar_chart";
export type TasksBoardChartType = "vertical_bar" | "horizontal_bar" | "line" | "pie";
export type TasksBoardChartGroupBy = "status" | "client" | "case" | "assignedTo";
export type TasksBoardChartSortBy = "count" | "label";
export type TasksOpenTaskMode = "side_sheet" | "center_modal";
export type TasksKanbanCardSize = "small" | "medium" | "large";
export type TasksKanbanCardLayout = "compact" | "list";

export type TaskFilters = {
  assignedMembershipId: string;
  caseId: string;
  caseLabel: string;
  clientId: string;
  clientLabel: string;
  dueStatus: "" | TenantCaseTasksDueStatus;
  endDateFrom: string;
  endDateTo: string;
  practiceAreaId: string;
  search: string;
  status: "" | CaseTaskStatus;
};

export type TaskBoardSettings = TaskBoardSettingsDto;
