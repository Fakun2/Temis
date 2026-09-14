import {
  defaultTaskBoardSettings,
  type TaskBoardSettings
} from "../_components/task-list-types";

export function normalizeTaskBoardSettings(
  settings?: Partial<TaskBoardSettings>
): TaskBoardSettings {
  const visibleProperties = settings?.visibleProperties?.length
    ? settings.visibleProperties
    : defaultTaskBoardSettings.visibleProperties;

  return {
    chartGroupBy: settings?.chartGroupBy ?? defaultTaskBoardSettings.chartGroupBy,
    chartShowHorizontalLines:
      settings?.chartShowHorizontalLines ?? defaultTaskBoardSettings.chartShowHorizontalLines,
    chartSortBy: settings?.chartSortBy ?? defaultTaskBoardSettings.chartSortBy,
    chartSortDirection: settings?.chartSortDirection ?? defaultTaskBoardSettings.chartSortDirection,
    chartType: settings?.chartType ?? defaultTaskBoardSettings.chartType,
    hideZeroValues: settings?.hideZeroValues ?? defaultTaskBoardSettings.hideZeroValues,
    kanbanCardLayout: settings?.kanbanCardLayout ?? defaultTaskBoardSettings.kanbanCardLayout,
    kanbanCardSize: settings?.kanbanCardSize ?? defaultTaskBoardSettings.kanbanCardSize,
    kanbanColorColumns: settings?.kanbanColorColumns ?? defaultTaskBoardSettings.kanbanColorColumns,
    openTaskIn: settings?.openTaskIn ?? defaultTaskBoardSettings.openTaskIn,
    sortBy: settings?.sortBy ?? defaultTaskBoardSettings.sortBy,
    sortDirection: settings?.sortDirection ?? defaultTaskBoardSettings.sortDirection,
    viewMode: settings?.viewMode ?? defaultTaskBoardSettings.viewMode,
    visibleProperties
  };
}
