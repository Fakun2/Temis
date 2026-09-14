import { caseTaskStatusLabels } from "../../../cases/_constants/cases.constants";
import type {
  CaseTaskStatus,
  TenantCaseTasksDueStatus
} from "../../../cases/_types/cases.types";
import type { TaskFilters } from "../task-list-types";

export const taskStatusFilterOptions: Array<{ label: string; value: CaseTaskStatus }> = [
  { label: caseTaskStatusLabels.pending, value: "pending" },
  { label: caseTaskStatusLabels.in_progress, value: "in_progress" },
  { label: caseTaskStatusLabels.completed, value: "completed" },
  { label: caseTaskStatusLabels.cancelled, value: "cancelled" }
];

export const taskDueStatusLabels: Record<TenantCaseTasksDueStatus, string> = {
  due_soon: "Por vencer",
  overdue: "Vencidas"
};

export const taskDueStatusFilterOptions: Array<{
  label: string;
  value: TenantCaseTasksDueStatus;
}> = [
  { label: taskDueStatusLabels.due_soon, value: "due_soon" },
  { label: taskDueStatusLabels.overdue, value: "overdue" }
];

export function getTaskDateRangeLabel(filters: TaskFilters) {
  if (filters.endDateFrom && filters.endDateTo) {
    return `${filters.endDateFrom} - ${filters.endDateTo}`;
  }

  if (filters.endDateFrom) {
    return `Desde ${filters.endDateFrom}`;
  }

  if (filters.endDateTo) {
    return `Hasta ${filters.endDateTo}`;
  }

  return undefined;
}
