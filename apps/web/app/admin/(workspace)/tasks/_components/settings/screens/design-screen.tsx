"use client";

import type {
  TasksBoardChartType,
  TasksBoardViewModeOption,
  TasksKanbanCardLayout,
  TasksKanbanCardSize,
  TasksOpenTaskMode
} from "../../task-list-types";
import { SettingsHeader } from "../settings-primitives";
import type { TasksSettingsScreen } from "../settings-types";
import { BoardViewSelector } from "./board-view-selector";
import { ChartDesignSettings } from "./chart-design-settings";
import { KanbanDesignSettings } from "./kanban-design-settings";
import { OpenTaskDesignSetting } from "./open-task-design-setting";

type DesignScreenProps = {
  activeChartType: TasksBoardChartType;
  activeViewMode: TasksBoardViewModeOption;
  chartShowHorizontalLines: boolean;
  kanbanCardLayout: TasksKanbanCardLayout;
  kanbanCardSize: TasksKanbanCardSize;
  kanbanColorColumns: boolean;
  openTaskIn: TasksOpenTaskMode;
  onBack: () => void;
  onChartShowHorizontalLinesChange: (checked: boolean) => void;
  onChartTypeChange: (chartType: TasksBoardChartType) => void;
  onClose: () => void;
  onKanbanCardLayoutChange: (layout: TasksKanbanCardLayout) => void;
  onKanbanColorColumnsChange: (checked: boolean) => void;
  onOpenScreen: (screen: TasksSettingsScreen) => void;
  onSelect: (mode: TasksBoardViewModeOption) => void;
};

export function DesignScreen({
  activeChartType,
  activeViewMode,
  chartShowHorizontalLines,
  kanbanCardLayout,
  kanbanCardSize,
  kanbanColorColumns,
  openTaskIn,
  onBack,
  onChartShowHorizontalLinesChange,
  onChartTypeChange,
  onClose,
  onKanbanCardLayoutChange,
  onKanbanColorColumnsChange,
  onOpenScreen,
  onSelect
}: DesignScreenProps) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Diseño" onBack={onBack} onClose={onClose} />
      <BoardViewSelector activeViewMode={activeViewMode} onSelect={onSelect} />

      {activeViewMode === "bar_chart" ? (
        <ChartDesignSettings
          activeChartType={activeChartType}
          chartShowHorizontalLines={chartShowHorizontalLines}
          openTaskIn={openTaskIn}
          onChartShowHorizontalLinesChange={onChartShowHorizontalLinesChange}
          onChartTypeChange={onChartTypeChange}
          onOpenScreen={onOpenScreen}
        />
      ) : null}

      {activeViewMode === "kanban" ? (
        <KanbanDesignSettings
          kanbanCardLayout={kanbanCardLayout}
          kanbanCardSize={kanbanCardSize}
          kanbanColorColumns={kanbanColorColumns}
          openTaskIn={openTaskIn}
          onKanbanCardLayoutChange={onKanbanCardLayoutChange}
          onKanbanColorColumnsChange={onKanbanColorColumnsChange}
          onOpenScreen={onOpenScreen}
        />
      ) : null}

      {activeViewMode === "calendar" || activeViewMode === "table" ? (
        <OpenTaskDesignSetting openTaskIn={openTaskIn} onOpenScreen={onOpenScreen} />
      ) : null}
    </div>
  );
}
