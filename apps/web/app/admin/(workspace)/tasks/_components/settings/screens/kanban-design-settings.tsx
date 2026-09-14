"use client";

import { Columns3, LayoutGrid } from "lucide-react";
import type {
  TasksKanbanCardLayout,
  TasksKanbanCardSize,
  TasksOpenTaskMode
} from "../../task-list-types";
import { KanbanCardLayoutSelector } from "../kanban-card-layout-selector";
import { getKanbanCardSizeLabel } from "../settings-labels";
import { SettingsRow, SettingsToggleRow } from "../settings-primitives";
import type { TasksSettingsScreen } from "../settings-types";
import { OpenTaskDesignSetting } from "./open-task-design-setting";

export function KanbanDesignSettings({
  kanbanCardLayout,
  kanbanCardSize,
  kanbanColorColumns,
  openTaskIn,
  onKanbanCardLayoutChange,
  onKanbanColorColumnsChange,
  onOpenScreen
}: {
  kanbanCardLayout: TasksKanbanCardLayout;
  kanbanCardSize: TasksKanbanCardSize;
  kanbanColorColumns: boolean;
  openTaskIn: TasksOpenTaskMode;
  onKanbanCardLayoutChange: (layout: TasksKanbanCardLayout) => void;
  onKanbanColorColumnsChange: (checked: boolean) => void;
  onOpenScreen: (screen: TasksSettingsScreen) => void;
}) {
  return (
    <div className="grid gap-2">
      <KanbanCardLayoutSelector
        activeLayout={kanbanCardLayout}
        onLayoutChange={onKanbanCardLayoutChange}
      />
      <div className="grid gap-0.5">
        <SettingsToggleRow
          checked={kanbanColorColumns}
          icon={Columns3}
          label="Columnas de color"
          onCheckedChange={onKanbanColorColumnsChange}
        />
        <OpenTaskDesignSetting openTaskIn={openTaskIn} onOpenScreen={onOpenScreen} />
        <SettingsRow
          icon={LayoutGrid}
          label="Tamano de tarjeta"
          value={getKanbanCardSizeLabel(kanbanCardSize)}
          onSelect={() => onOpenScreen("card-size")}
        />
      </div>
    </div>
  );
}
