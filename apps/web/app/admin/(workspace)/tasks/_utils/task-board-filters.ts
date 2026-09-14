import type { TaskBoardFiltersDto } from "../../cases/_types/cases.types";
import type { TaskFilters } from "../_components/task-list-types";

export function getSuggestedBoardName(filters: TaskFilters) {
  if (filters.caseId) {
    return `Tablero de expediente ${filters.caseLabel || filters.caseId}`;
  }

  if (filters.clientId) {
    return `Tablero de cliente ${filters.clientLabel || filters.clientId}`;
  }

  return "Tablero de tareas";
}

export function toBoardFilters(filters: TaskFilters): TaskBoardFiltersDto {
  return {
    ...(filters.assignedMembershipId ? { assignedMembershipId: filters.assignedMembershipId } : {}),
    ...(filters.caseId ? { caseId: filters.caseId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.dueStatus ? { dueStatus: filters.dueStatus } : {}),
    ...(filters.endDateFrom ? { endDateFrom: filters.endDateFrom } : {}),
    ...(filters.endDateTo ? { endDateTo: filters.endDateTo } : {}),
    ...(filters.practiceAreaId ? { practiceAreaId: filters.practiceAreaId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };
}

export function fromBoardFilters(filters: TaskBoardFiltersDto): TaskFilters {
  return {
    assignedMembershipId: filters.assignedMembershipId ?? "",
    caseId: filters.caseId ?? "",
    caseLabel: "",
    clientId: filters.clientId ?? "",
    clientLabel: "",
    dueStatus: filters.dueStatus ?? "",
    endDateFrom: filters.endDateFrom ?? "",
    endDateTo: filters.endDateTo ?? "",
    practiceAreaId: filters.practiceAreaId ?? "",
    search: filters.search ?? "",
    status: filters.status ?? ""
  };
}
