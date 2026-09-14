"use client";

import { List } from "lucide-react";
import type {
  TasksBoardChartType,
  TasksOpenTaskMode
} from "../../task-list-types";
import { ChartTypeSelector } from "../chart-type-selector";
import { SettingsToggleRow } from "../settings-primitives";
import type { TasksSettingsScreen } from "../settings-types";
import { OpenTaskDesignSetting } from "./open-task-design-setting";

export function ChartDesignSettings({
  activeChartType,
  chartShowHorizontalLines,
  openTaskIn,
  onChartShowHorizontalLinesChange,
  onChartTypeChange,
  onOpenScreen
}: {
  activeChartType: TasksBoardChartType;
  chartShowHorizontalLines: boolean;
  openTaskIn: TasksOpenTaskMode;
  onChartShowHorizontalLinesChange: (checked: boolean) => void;
  onChartTypeChange: (chartType: TasksBoardChartType) => void;
  onOpenScreen: (screen: TasksSettingsScreen) => void;
}) {
  return (
    <div className="grid gap-2">
      <ChartTypeSelector activeChartType={activeChartType} onChartTypeChange={onChartTypeChange} />
      <div className="grid gap-0.5">
        <SettingsToggleRow
          checked={chartShowHorizontalLines}
          icon={List}
          label="Mostrar lineas horizontales"
          onCheckedChange={onChartShowHorizontalLinesChange}
        />
        <OpenTaskDesignSetting openTaskIn={openTaskIn} onOpenScreen={onOpenScreen} />
      </div>
    </div>
  );
}
