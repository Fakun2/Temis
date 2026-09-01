"use client";

import { useMemo } from "react";
import { buildHeatmapCells, buildHeatmapItems, normalizeDailyUsage } from "../utils";
import type { AccountAiUsageDay, TokenHeatmapData, UsageViewMode } from "../types";

export function useTokenHeatmap(
  dailyUsage: AccountAiUsageDay[],
  mode: UsageViewMode
): TokenHeatmapData {
  return useMemo(() => {
    const normalizedUsage = normalizeDailyUsage(dailyUsage);
    const items = buildHeatmapItems(normalizedUsage, mode);
    const { cells, columnCount, monthLabels } = buildHeatmapCells(items);

    return {
      cells,
      columnCount,
      maxTokens: Math.max(...items.map((item) => item.totalTokens), 0),
      monthLabels
    };
  }, [dailyUsage, mode]);
}
