"use client";

import { LayoutGrid } from "lucide-react";
import type { TaskBoardSortKey } from "../../../../cases/_types/cases.types";
import type {
  TasksBoardChartGroupBy,
  TasksBoardChartSortBy,
  TasksKanbanCardSize,
  TasksOpenTaskMode
} from "../../task-list-types";
import { taskBoardSortLabels } from "../settings-labels";
import {
  chartGroupOptions,
  chartSortOptions,
  kanbanCardSizeOptions,
  openTaskOptions,
  sortOptions
} from "../settings-options";
import { SettingsHeader, SettingsSearch } from "../settings-primitives";
import { SettingsDirectionPicker, SettingsOptionList } from "../settings-option-list";

type SortScreenProps = {
  activeSortBy: TaskBoardSortKey;
  direction: "asc" | "desc";
  onBack: () => void;
  onClose: () => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
  onSearchChange: (value: string) => void;
  onSortByChange: (sortBy: TaskBoardSortKey) => void;
  options: typeof sortOptions;
  search: string;
};

export function SortScreen({
  activeSortBy,
  direction,
  onBack,
  onClose,
  onDirectionChange,
  onSearchChange,
  onSortByChange,
  options,
  search
}: SortScreenProps) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Nuevo orden" onBack={onBack} onClose={onClose} />
      <SettingsSearch placeholder="Ordenar por..." value={search} onChange={onSearchChange} />
      <SettingsOptionList
        activeValue={activeSortBy}
        getLabel={(option) => taskBoardSortLabels[option.value]}
        options={options}
        onSelect={onSortByChange}
      />
      <SettingsDirectionPicker direction={direction} onDirectionChange={onDirectionChange} />
    </div>
  );
}

export function ChartGroupScreen({
  activeGroupBy,
  onBack,
  onClose,
  onGroupByChange
}: {
  activeGroupBy: TasksBoardChartGroupBy;
  onBack: () => void;
  onClose: () => void;
  onGroupByChange: (groupBy: TasksBoardChartGroupBy) => void;
}) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Que mostrar" onBack={onBack} onClose={onClose} />
      <SettingsOptionList
        activeValue={activeGroupBy}
        options={chartGroupOptions}
        onSelect={onGroupByChange}
      />
    </div>
  );
}

export function ChartSortScreen({
  activeSortBy,
  direction,
  onBack,
  onClose,
  onDirectionChange,
  onSortByChange
}: {
  activeSortBy: TasksBoardChartSortBy;
  direction: "asc" | "desc";
  onBack: () => void;
  onClose: () => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
  onSortByChange: (sortBy: TasksBoardChartSortBy) => void;
}) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Ordenar grafico" onBack={onBack} onClose={onClose} />
      <SettingsOptionList
        activeValue={activeSortBy}
        options={chartSortOptions}
        onSelect={onSortByChange}
      />
      <SettingsDirectionPicker direction={direction} onDirectionChange={onDirectionChange} />
    </div>
  );
}

export function OpenTaskInScreen({
  activeOpenTaskIn,
  onBack,
  onClose,
  onOpenTaskInChange
}: {
  activeOpenTaskIn: TasksOpenTaskMode;
  onBack: () => void;
  onClose: () => void;
  onOpenTaskInChange: (openTaskIn: TasksOpenTaskMode) => void;
}) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Abrir paginas en" onBack={onBack} onClose={onClose} />
      <SettingsOptionList
        activeValue={activeOpenTaskIn}
        options={openTaskOptions}
        onSelect={onOpenTaskInChange}
      />
    </div>
  );
}

export function KanbanCardSizeScreen({
  activeSize,
  onBack,
  onClose,
  onSizeChange
}: {
  activeSize: TasksKanbanCardSize;
  onBack: () => void;
  onClose: () => void;
  onSizeChange: (size: TasksKanbanCardSize) => void;
}) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Tamano de tarjeta" onBack={onBack} onClose={onClose} />
      <SettingsOptionList
        activeValue={activeSize}
        fallbackIcon={LayoutGrid}
        options={kanbanCardSizeOptions}
        onSelect={onSizeChange}
      />
    </div>
  );
}
