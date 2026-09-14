"use client";

import { ArrowDownAZ, BarChart3, Eye, EyeOff, Table2 } from "lucide-react";
import type {
  TasksBoardChartGroupBy,
  TasksBoardChartSortBy,
  TasksBoardChartType,
  TasksBoardViewModeOption
} from "../../task-list-types";
import { ChartTypeSelector } from "../chart-type-selector";
import {
  getChartGroupLabel,
  getChartSortDirectionLabel,
  getChartSortLabel
} from "../settings-labels";
import {
  SettingsHeader,
  SettingsReadOnlyRow,
  SettingsRow,
  SettingsSectionLabel,
  SettingsToggleRow
} from "../settings-primitives";
import type { TasksSettingsScreen } from "../settings-types";

type SettingsHomeScreenProps = {
  activeChartGroupBy: TasksBoardChartGroupBy;
  activeChartSortBy: TasksBoardChartSortBy;
  activeChartType: TasksBoardChartType;
  activeViewLabel: string;
  activeViewMode: TasksBoardViewModeOption;
  chartSortDirection: "asc" | "desc";
  hideZeroValues: boolean;
  onChartTypeChange: (chartType: TasksBoardChartType) => void;
  onClose: () => void;
  onHideZeroValuesChange: (hideZeroValues: boolean) => void;
  onOpenScreen: (screen: TasksSettingsScreen) => void;
  propertyCount: number;
  sortLabel: string;
};

export function SettingsHomeScreen(props: SettingsHomeScreenProps) {
  if (props.activeViewMode === "bar_chart") {
    return <ChartSettingsHomeScreen {...props} />;
  }

  return (
    <div className="grid gap-2">
      <SettingsHeader title="Configuracion" onClose={props.onClose} />
      <div className="grid gap-0.5">
        <SettingsRow
          icon={Table2}
          label="Diseño"
          value={props.activeViewLabel}
          onSelect={() => props.onOpenScreen("design")}
        />
        {props.activeViewMode === "table" || props.activeViewMode === "kanban" ? (
          <SettingsRow
            icon={Eye}
            label="Visibilidad de la propiedad"
            value={String(props.propertyCount)}
            onSelect={() => props.onOpenScreen("visibility")}
          />
        ) : null}
        <SettingsRow
          icon={ArrowDownAZ}
          label="Ordenar"
          value={props.sortLabel}
          onSelect={() => props.onOpenScreen("sort")}
        />
      </div>
    </div>
  );
}

function ChartSettingsHomeScreen({
  activeChartGroupBy,
  activeChartSortBy,
  activeChartType,
  activeViewLabel,
  chartSortDirection,
  hideZeroValues,
  onChartTypeChange,
  onClose,
  onHideZeroValuesChange,
  onOpenScreen
}: SettingsHomeScreenProps) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Configuracion" onClose={onClose} />

      <div className="rounded-lg bg-secondary/35 p-1">
        <div className="flex h-8 items-center gap-2 rounded-md bg-background/60 px-2 text-xs font-semibold text-foreground">
          <BarChart3 className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Grafico por estado</span>
          <span className="grid size-4 place-items-center rounded-full bg-muted text-[10px] text-muted-foreground">
            i
          </span>
        </div>
      </div>

      <div className="grid gap-0.5">
        <SettingsRow
          icon={BarChart3}
          label="Diseño"
          value={activeViewLabel}
          onSelect={() => onOpenScreen("design")}
        />
      </div>

      <ChartTypeSelector activeChartType={activeChartType} onChartTypeChange={onChartTypeChange} />

      <div className="grid gap-0.5">
        <SettingsSectionLabel>Eje X</SettingsSectionLabel>
        <SettingsRow
          icon={ArrowDownAZ}
          label="Que mostrar"
          value={getChartGroupLabel(activeChartGroupBy)}
          onSelect={() => onOpenScreen("chart-group")}
        />
        <SettingsRow
          icon={ArrowDownAZ}
          label="Ordenar por"
          value={`${getChartSortLabel(activeChartSortBy)} ${getChartSortDirectionLabel(
            activeChartSortBy,
            chartSortDirection
          )}`}
          onSelect={() => onOpenScreen("chart-sort")}
        />
        <SettingsToggleRow
          checked={hideZeroValues}
          icon={EyeOff}
          label="Omitir valores en cero"
          onCheckedChange={onHideZeroValuesChange}
        />
      </div>

      <div className="grid gap-0.5">
        <SettingsSectionLabel>Eje Y</SettingsSectionLabel>
        <SettingsReadOnlyRow icon={ArrowDownAZ} label="Que mostrar" value="Recuento" />
      </div>
    </div>
  );
}
