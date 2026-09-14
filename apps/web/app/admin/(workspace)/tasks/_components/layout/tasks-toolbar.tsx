"use client";

import { Columns3, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { AdminTableHeaderActionButton } from "../../../_components/admin-table-header-action-button";
import { CaseTaskSheet } from "../../../cases/_components/detail/task-sheet";
import { emptyTaskFilters } from "../../_constants/task-list.constants";
import { useTasksContext } from "../../_context/tasks-context";
import { TasksFiltersDialog } from "../filters/tasks-filters-dialog";
import { TasksBoardSettingsMenu } from "../settings/menu/tasks-board-settings-menu";

export function TasksToolbar({ className }: { className?: string }) {
  const {
    assignees,
    boardSettings,
    canCreate,
    filters,
    updateFilters,
    updateViewMode,
    viewMode
  } = useTasksContext();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <ButtonGroup>
        <Button
          type="button"
          variant={viewMode === "table" ? "secondary" : "outline"}
          className="h-9 gap-2 border-border/50 px-3 text-xs"
          aria-pressed={viewMode === "table"}
          onClick={() => void updateViewMode("table")}
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          Todas las tareas
        </Button>
        <Button
          type="button"
          variant={viewMode === "kanban" ? "secondary" : "outline"}
          className="h-9 gap-2 border-border/50 px-3 text-xs"
          aria-pressed={viewMode === "kanban"}
          onClick={() => void updateViewMode("kanban")}
        >
          <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
          Kanban por estado
        </Button>
      </ButtonGroup>
      <TasksFiltersDialog
        assignees={assignees}
        filters={filters}
        onApply={updateFilters}
        onReset={() => updateFilters(emptyTaskFilters)}
      />
      {viewMode === "kanban" ? <TasksBoardSettingsMenu /> : null}
      {canCreate ? (
        <CaseTaskSheet
          assignees={assignees}
          presentation={boardSettings.openTaskIn === "center_modal" ? "dialog" : "sheet"}
          trigger={<AdminTableHeaderActionButton icon={Plus} label="Nueva tarea" tone="primary" />}
        />
      ) : null}
    </div>
  );
}
