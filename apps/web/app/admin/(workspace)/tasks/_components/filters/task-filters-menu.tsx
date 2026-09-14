"use client";

import { useState, type FormEvent } from "react";
import {
  AdminTableFilterClearItem,
  AdminTableFilterMenu
} from "../../../_components/admin-table-filter-menu";
import type { CasePickerOption } from "../../../cases/_components/case-picker-field";
import type { TaskAssigneeOption } from "../../../cases/_types/cases.types";
import type { TaskFilters } from "../task-list-types";
import { getTaskDateRangeLabel } from "./task-filter-options";
import {
  CaseTaskDialog,
  DueDateRangeDialog,
  SearchTaskDialog
} from "./task-filter-dialogs";
import { useTaskFilterSections } from "./use-task-filter-sections";
import { useTaskFilterOptions } from "./use-task-filter-options";

export function TaskFiltersMenu({
  assignees,
  filters,
  onApply,
  onReset
}: {
  assignees: TaskAssigneeOption[];
  filters: TaskFilters;
  onApply: (filters: TaskFilters) => void;
  onReset: () => void;
}) {
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState({
    endDateFrom: filters.endDateFrom,
    endDateTo: filters.endDateTo
  });
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [selectedCase, setSelectedCase] = useState<CasePickerOption | null>(null);
  const { clients, clientsQuery, currentAssignee, practiceAreas } = useTaskFilterOptions(assignees);
  const selectedClientName =
    filters.clientLabel || clients.find((client) => client.id === filters.clientId)?.displayName;
  const selectedDateRange = getTaskDateRangeLabel(filters);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const sections = useTaskFilterSections({
    assignees,
    clients,
    clientsAllowed: clientsQuery.hasPermission,
    currentAssignee,
    filters,
    onApply,
    onClearCase: () => setSelectedCase(null),
    onOpenCaseDialog: () => setCaseDialogOpen(true),
    onOpenDateDialog: openDateDialog,
    onOpenSearchDialog: openSearchDialog,
    practiceAreas,
    selectedClientName,
    selectedDateRange
  });

  function clearFilters() {
    setSelectedCase(null);
    onReset();
  }

  function openDateDialog() {
    setDateDraft({
      endDateFrom: filters.endDateFrom,
      endDateTo: filters.endDateTo
    });
    setDateDialogOpen(true);
  }

  function openSearchDialog() {
    setSearchDraft(filters.search);
    setSearchDialogOpen(true);
  }

  function selectCase(caseItem: CasePickerOption) {
    setSelectedCase(caseItem);
    onApply({ ...filters, caseId: caseItem.id, caseLabel: caseItem.caseNumber });
    setCaseDialogOpen(false);
  }

  function submitDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({ ...filters, endDateFrom: dateDraft.endDateFrom, endDateTo: dateDraft.endDateTo });
    setDateDialogOpen(false);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({ ...filters, search: searchDraft.trim() });
    setSearchDialogOpen(false);
  }

  return (
    <>
      <AdminTableFilterMenu
        active={hasActiveFilters}
        subMenuSide="right"
        sections={sections}
        footer={<AdminTableFilterClearItem disabled={!hasActiveFilters} onClear={clearFilters} />}
      />

      <SearchTaskDialog
        open={searchDialogOpen}
        searchDraft={searchDraft}
        onCancel={() => setSearchDialogOpen(false)}
        onOpenChange={setSearchDialogOpen}
        onSearchDraftChange={setSearchDraft}
        onSubmit={submitSearch}
      />
      <CaseTaskDialog
        caseLabel={filters.caseLabel}
        open={caseDialogOpen}
        selectedCase={selectedCase}
        onCancel={() => setCaseDialogOpen(false)}
        onOpenChange={setCaseDialogOpen}
        onSelect={selectCase}
      />
      <DueDateRangeDialog
        dateDraft={dateDraft}
        open={dateDialogOpen}
        onCancel={() => setDateDialogOpen(false)}
        onDateDraftChange={setDateDraft}
        onOpenChange={setDateDialogOpen}
        onSubmit={submitDateRange}
      />
    </>
  );
}
