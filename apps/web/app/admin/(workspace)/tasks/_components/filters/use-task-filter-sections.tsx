"use client";

import { useMemo } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  Search,
  UserRound,
  UsersRound
} from "lucide-react";
import type { ClientSummaryDto } from "@bogaap/api-client";
import type { AdminTableFilterSection } from "../../../_components/admin-table-filter-menu";
import type {
  CaseTaskStatus,
  TaskAssigneeOption,
  TenantCaseTasksDueStatus
} from "../../../cases/_types/cases.types";
import type { TaskFilters } from "../task-list-types";
import { taskDueStatusFilterOptions, taskStatusFilterOptions } from "./task-filter-options";

type PracticeAreaOption = {
  id: string;
  name: string;
};

export function useTaskFilterSections({
  assignees,
  clients,
  clientsAllowed,
  currentAssignee,
  filters,
  onApply,
  onClearCase,
  onOpenCaseDialog,
  onOpenDateDialog,
  onOpenSearchDialog,
  practiceAreas,
  selectedClientName,
  selectedDateRange
}: {
  assignees: TaskAssigneeOption[];
  clients: ClientSummaryDto[];
  clientsAllowed: boolean;
  currentAssignee?: TaskAssigneeOption;
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  onClearCase: () => void;
  onOpenCaseDialog: () => void;
  onOpenDateDialog: () => void;
  onOpenSearchDialog: () => void;
  practiceAreas: PracticeAreaOption[];
  selectedClientName?: string;
  selectedDateRange?: string;
}) {
  return useMemo<AdminTableFilterSection[]>(
    () => [
      getSearchSection({ filters, onApply, onOpenSearchDialog }),
      getStatusSection({ filters, onApply }),
      getDueSection({ filters, onApply, onOpenDateDialog, selectedDateRange }),
      getAssigneeSection({ assignees, currentAssignee, filters, onApply, practiceAreas }),
      getClientSection({ clients, clientsAllowed, filters, onApply, selectedClientName }),
      getCaseSection({ filters, onApply, onClearCase, onOpenCaseDialog })
    ],
    [
      assignees,
      clients,
      clientsAllowed,
      currentAssignee,
      filters,
      onApply,
      onClearCase,
      onOpenCaseDialog,
      onOpenDateDialog,
      onOpenSearchDialog,
      practiceAreas,
      selectedClientName,
      selectedDateRange
    ]
  );
}

function getSearchSection({
  filters,
  onApply,
  onOpenSearchDialog
}: {
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  onOpenSearchDialog: () => void;
}): AdminTableFilterSection {
  return {
    icon: Search,
    label: "Busqueda",
    options: [
      {
        active: filters.search.trim() === "",
        label: "Todas",
        onSelect: () => onApply({ ...filters, search: "" })
      },
      {
        active: Boolean(filters.search.trim()),
        label: "Descripcion, notas o expediente",
        valueLabel: filters.search.trim() || undefined,
        onSelect: onOpenSearchDialog
      }
    ]
  };
}

function getStatusSection({
  filters,
  onApply
}: {
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
}): AdminTableFilterSection {
  return {
    icon: ClipboardList,
    label: "Estado",
    options: [
      {
        active: filters.status === "",
        label: "Todos",
        onSelect: () => onApply({ ...filters, status: "" })
      },
      ...taskStatusFilterOptions.map((option) => ({
        active: filters.status === option.value,
        label: option.label,
        onSelect: () => onApply({ ...filters, status: option.value as CaseTaskStatus })
      }))
    ]
  };
}

function getDueSection({
  filters,
  onApply,
  onOpenDateDialog,
  selectedDateRange
}: {
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  onOpenDateDialog: () => void;
  selectedDateRange?: string;
}): AdminTableFilterSection {
  return {
    icon: CalendarDays,
    label: "Vencimiento",
    options: [
      {
        active: filters.dueStatus === "" && !selectedDateRange,
        label: "Todos",
        onSelect: () => onApply({ ...filters, dueStatus: "", endDateFrom: "", endDateTo: "" })
      },
      ...taskDueStatusFilterOptions.map((option) => ({
        active: filters.dueStatus === option.value,
        label: option.label,
        onSelect: () => onApply({ ...filters, dueStatus: option.value as TenantCaseTasksDueStatus })
      })),
      {
        active: Boolean(selectedDateRange),
        label: "Rango de fechas",
        valueLabel: selectedDateRange,
        onSelect: onOpenDateDialog
      }
    ]
  };
}

function getAssigneeSection({
  assignees,
  currentAssignee,
  filters,
  onApply,
  practiceAreas
}: {
  assignees: TaskAssigneeOption[];
  currentAssignee?: TaskAssigneeOption;
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  practiceAreas: PracticeAreaOption[];
}): AdminTableFilterSection {
  return {
    icon: UserRound,
    label: "Asignado",
    options: [
      {
        active: filters.assignedMembershipId === "" && filters.practiceAreaId === "",
        label: "Todos",
        onSelect: () => onApply({ ...filters, assignedMembershipId: "", practiceAreaId: "" })
      },
      {
        active: Boolean(currentAssignee && filters.assignedMembershipId === currentAssignee.id),
        disabled: !currentAssignee,
        label: "Uno mismo",
        onSelect: () => {
          if (currentAssignee) {
            onApply({ ...filters, assignedMembershipId: currentAssignee.id, practiceAreaId: "" });
          }
        }
      },
      ...practiceAreas.map((area) => ({
        active: filters.practiceAreaId === area.id,
        icon: BriefcaseBusiness,
        label: area.name,
        valueLabel: "Area",
        onSelect: () => onApply({ ...filters, assignedMembershipId: "", practiceAreaId: area.id })
      })),
      ...assignees.map((assignee) => ({
        active: filters.assignedMembershipId === assignee.id && filters.practiceAreaId === "",
        label: assignee.fullName,
        onSelect: () =>
          onApply({ ...filters, assignedMembershipId: assignee.id, practiceAreaId: "" })
      }))
    ]
  };
}

function getClientSection({
  clients,
  clientsAllowed,
  filters,
  onApply,
  selectedClientName
}: {
  clients: ClientSummaryDto[];
  clientsAllowed: boolean;
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  selectedClientName?: string;
}): AdminTableFilterSection {
  return {
    disabled: !clientsAllowed,
    icon: UsersRound,
    label: "Cliente",
    options: [
      {
        active: filters.clientId === "",
        label: "Todos",
        onSelect: () => onApply({ ...filters, clientId: "", clientLabel: "" })
      },
      ...clients.map((client) => ({
        active: filters.clientId === client.id,
        label: client.displayName,
        valueLabel: filters.clientId === client.id ? selectedClientName : undefined,
        onSelect: () =>
          onApply({ ...filters, clientId: client.id, clientLabel: client.displayName })
      }))
    ]
  };
}

function getCaseSection({
  filters,
  onApply,
  onClearCase,
  onOpenCaseDialog
}: {
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  onClearCase: () => void;
  onOpenCaseDialog: () => void;
}): AdminTableFilterSection {
  return {
    icon: FolderKanban,
    label: "Expediente",
    options: [
      {
        active: filters.caseId === "",
        label: "Todos",
        onSelect: () => {
          onClearCase();
          onApply({ ...filters, caseId: "", caseLabel: "" });
        }
      },
      {
        active: Boolean(filters.caseId),
        label: "Seleccionar expediente",
        valueLabel: filters.caseLabel || filters.caseId || undefined,
        onSelect: onOpenCaseDialog
      }
    ]
  };
}
