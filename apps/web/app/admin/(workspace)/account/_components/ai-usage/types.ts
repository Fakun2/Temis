import type { AccountAiUsageDay, AccountAiUsageResponse } from "../../_types/ai-usage.types";

export type { AccountAiUsageDay, AccountAiUsageResponse };

export type UsageViewMode = "daily" | "weekly" | "accumulated";

export type TokenUsageDay = {
  date: Date;
  inputTokens: number;
  key: string;
  monthKey: string;
  outputTokens: number;
  totalTokens: number;
};

export type TokenUsageGridItem = TokenUsageDay & {
  groupKey?: string;
  isPainted?: boolean;
  tooltipLabel: string;
  tooltipTokens: number;
};

export type TokenMonthLabel = {
  column: number;
  month: string;
};

export type TokenHeatmapData = {
  cells: Array<TokenUsageGridItem | null>;
  columnCount: number;
  maxTokens: number;
  monthLabels: TokenMonthLabel[];
};
