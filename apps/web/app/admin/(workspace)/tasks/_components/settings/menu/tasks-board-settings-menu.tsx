"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminTableHeaderActionButton } from "../../../../_components/admin-table-header-action-button";
import type { TaskBoardVisibleProperty } from "../../../../cases/_types/cases.types";
import { useTasksContext } from "../../../_context/tasks-context";
import {
  getPropertyLabel,
  getViewLabel,
  taskBoardSortLabels
} from "../settings-labels";
import { sortOptions, visiblePropertyOptions } from "../settings-options";
import { DesignScreen } from "../screens/design-screen";
import { SettingsHomeScreen } from "../screens/settings-home-screen";
import { PropertyVisibilityScreen } from "../screens/property-visibility-screen";
import {
  ChartGroupScreen,
  ChartSortScreen,
  KanbanCardSizeScreen,
  OpenTaskInScreen,
  SortScreen
} from "../screens/settings-choice-screens";
import type { TasksSettingsScreen } from "../settings-types";

type SettingsScreen = TasksSettingsScreen;

export function TasksBoardSettingsMenu() {
  const { boardSettings, updateBoardSettings } = useTasksContext();
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<SettingsScreen>("home");
  const [search, setSearch] = useState("");
  const visibleProperties = new Set(boardSettings.visibleProperties);
  const activeViewLabel = getViewLabel(boardSettings.viewMode);

  function closeMenu() {
    setOpen(false);
    setScreen("home");
    setSearch("");
  }

  function openScreen(nextScreen: SettingsScreen) {
    setScreen(nextScreen);
    setSearch("");
  }

  function toggleProperty(property: TaskBoardVisibleProperty) {
    const nextProperties = new Set(boardSettings.visibleProperties);

    if (nextProperties.has(property)) {
      nextProperties.delete(property);
    } else {
      nextProperties.add(property);
    }

    updateBoardSettings({ visibleProperties: [...nextProperties] });
  }

  const filteredProperties = useMemo(
    () =>
      visiblePropertyOptions.filter((property) =>
        getPropertyLabel(property.value).toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
  );
  const filteredSortOptions = useMemo(
    () =>
      sortOptions.filter((option) =>
        taskBoardSortLabels[option.value].toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
  );
  const screens: Record<SettingsScreen, ReactNode> = {
    home: (
      <SettingsHomeScreen
        activeChartType={boardSettings.chartType}
        activeChartGroupBy={boardSettings.chartGroupBy}
        activeChartSortBy={boardSettings.chartSortBy}
        chartSortDirection={boardSettings.chartSortDirection}
        activeViewLabel={activeViewLabel}
        activeViewMode={boardSettings.viewMode}
        hideZeroValues={boardSettings.hideZeroValues}
        onClose={closeMenu}
        onChartTypeChange={(chartType) => updateBoardSettings({ chartType })}
        onHideZeroValuesChange={(hideZeroValues) => updateBoardSettings({ hideZeroValues })}
        onOpenScreen={openScreen}
        propertyCount={boardSettings.visibleProperties.length + 1}
        sortLabel={taskBoardSortLabels[boardSettings.sortBy]}
      />
    ),
    "chart-group": (
      <ChartGroupScreen
        activeGroupBy={boardSettings.chartGroupBy}
        onBack={() => openScreen("home")}
        onClose={closeMenu}
        onGroupByChange={(chartGroupBy) => updateBoardSettings({ chartGroupBy })}
      />
    ),
    "chart-sort": (
      <ChartSortScreen
        activeSortBy={boardSettings.chartSortBy}
        direction={boardSettings.chartSortDirection}
        onBack={() => openScreen("home")}
        onClose={closeMenu}
        onDirectionChange={(chartSortDirection) => updateBoardSettings({ chartSortDirection })}
        onSortByChange={(chartSortBy) => updateBoardSettings({ chartSortBy })}
      />
    ),
    design: (
      <DesignScreen
        activeChartType={boardSettings.chartType}
        activeViewMode={boardSettings.viewMode}
        chartShowHorizontalLines={boardSettings.chartShowHorizontalLines}
        kanbanCardLayout={boardSettings.kanbanCardLayout}
        kanbanCardSize={boardSettings.kanbanCardSize}
        kanbanColorColumns={boardSettings.kanbanColorColumns}
        openTaskIn={boardSettings.openTaskIn}
        onBack={() => openScreen("home")}
        onChartTypeChange={(chartType) => updateBoardSettings({ chartType })}
        onChartShowHorizontalLinesChange={(chartShowHorizontalLines) =>
          updateBoardSettings({ chartShowHorizontalLines })
        }
        onClose={closeMenu}
        onKanbanCardLayoutChange={(kanbanCardLayout) =>
          updateBoardSettings({ kanbanCardLayout })
        }
        onKanbanColorColumnsChange={(kanbanColorColumns) =>
          updateBoardSettings({ kanbanColorColumns })
        }
        onOpenScreen={openScreen}
        onSelect={(viewMode) => updateBoardSettings({ viewMode })}
      />
    ),
    visibility: (
      <PropertyVisibilityScreen
        properties={filteredProperties}
        search={search}
        visibleProperties={visibleProperties}
        onBack={() => openScreen("home")}
        onClose={closeMenu}
        onHideAll={() => updateBoardSettings({ visibleProperties: [] })}
        onSearchChange={setSearch}
        onToggleProperty={toggleProperty}
      />
    ),
    sort: (
      <SortScreen
        activeSortBy={boardSettings.sortBy}
        direction={boardSettings.sortDirection}
        options={filteredSortOptions}
        search={search}
        onBack={() => openScreen("home")}
        onClose={closeMenu}
        onDirectionChange={(sortDirection) => updateBoardSettings({ sortDirection })}
        onSearchChange={setSearch}
        onSortByChange={(sortBy) => updateBoardSettings({ sortBy })}
      />
    ),
    "open-task": (
      <OpenTaskInScreen
        activeOpenTaskIn={boardSettings.openTaskIn}
        onBack={() => openScreen("design")}
        onClose={closeMenu}
        onOpenTaskInChange={(openTaskIn) => updateBoardSettings({ openTaskIn })}
      />
    ),
    "card-size": (
      <KanbanCardSizeScreen
        activeSize={boardSettings.kanbanCardSize}
        onBack={() => openScreen("design")}
        onClose={closeMenu}
        onSizeChange={(kanbanCardSize) => updateBoardSettings({ kanbanCardSize })}
      />
    )
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AdminTableHeaderActionButton
          aria-label="Abrir ajustes del tablero"
          icon={SlidersHorizontal}
          label="Ajustes"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[292px] max-w-[calc(100vw-1rem)] overflow-hidden p-0">
        <div className="max-h-[min(460px,calc(100svh-4rem))] overflow-y-auto p-2.5 scrollbar-thin">
          {screens[screen]}
        </div>
      </PopoverContent>
    </Popover>
  );
}
