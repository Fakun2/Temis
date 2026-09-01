import { formatNumber } from "../../_utils/account-format";
import { dayFormatter, HEATMAP_ROW_COUNT, monthFormatter, TOKEN_CELL_CLASSES } from "./constants";
import type {
  AccountAiUsageDay,
  TokenMonthLabel,
  TokenUsageDay,
  TokenUsageGridItem,
  UsageViewMode
} from "./types";

type WeeklyUsageGroup = {
  firstDay: TokenUsageDay;
  items: TokenUsageDay[];
  key: string;
  lastDay: TokenUsageDay;
  monthKey: string;
  totalTokens: number;
};

export function normalizeDailyUsage(days: AccountAiUsageDay[]): TokenUsageDay[] {
  return days.map((day) => {
    const date = new Date(`${day.date}T12:00:00.000Z`);

    return {
      date,
      inputTokens: day.inputTokens,
      key: day.date,
      monthKey: getMonthKey(date),
      outputTokens: day.outputTokens,
      totalTokens: day.totalTokens
    };
  });
}

export function buildHeatmapItems(days: TokenUsageDay[], mode: UsageViewMode) {
  if (mode === "daily") {
    return days.map<TokenUsageGridItem>((day) => ({
      ...day,
      tooltipLabel: `${dayFormatter.format(day.date)} · ${formatCompactTokens(day.totalTokens)} tokens`,
      tooltipTokens: day.totalTokens
    }));
  }

  return buildWeeklyHeatmapItems(days, mode);
}

export function buildHeatmapCells(items: TokenUsageGridItem[]) {
  const leadingEmptyCells = items[0]?.date.getUTCDay() ?? 0;
  const cells: Array<TokenUsageGridItem | null> = [
    ...Array.from({ length: leadingEmptyCells }, () => null),
    ...items
  ];

  return {
    cells,
    columnCount: getHeatmapColumnCount(cells.length),
    monthLabels: buildMonthLabels(items, leadingEmptyCells)
  };
}

export function getTokenIntensity(tokens: number, maxTokens: number) {
  if (tokens <= 0 || maxTokens <= 0) {
    return 0;
  }

  const ratio = tokens / maxTokens;
  if (ratio < 0.25) {
    return 1;
  }
  if (ratio < 0.5) {
    return 2;
  }
  if (ratio < 0.75) {
    return 3;
  }

  return 4;
}

export function getTokenCellClassName(intensity: number) {
  return TOKEN_CELL_CLASSES[intensity] ?? TOKEN_CELL_CLASSES[0];
}

export function getCellAnimationDelay(column: number, row: number) {
  return (column + row) * 9;
}

export function formatCompactTokens(value: number) {
  if (value >= 1_000_000) {
    return `${formatNumber(Number((value / 1_000_000).toFixed(1)))} M`;
  }

  if (value >= 1_000) {
    return `${formatNumber(Number((value / 1_000).toFixed(1)))} K`;
  }

  return formatNumber(value);
}

export function getReadablePlanName(plan: string) {
  const trimmedPlan = plan.trim();

  if (!trimmedPlan) {
    return "Free";
  }

  return trimmedPlan
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase("es-AR"));
}

function buildWeeklyHeatmapItems(days: TokenUsageDay[], mode: Exclude<UsageViewMode, "daily">) {
  const weeks = buildWeeklyGroups(days);
  const monthlyTotals = getMonthlyTotals(weeks);
  const annualTotal = weeks.reduce((sum, week) => sum + week.totalTokens, 0);
  let accumulatedTotal = 0;

  return weeks.flatMap((week) => {
    accumulatedTotal += week.totalTokens;
    const referenceTotal =
      mode === "accumulated" ? annualTotal : (monthlyTotals.get(week.monthKey) ?? 0);
    const tokens = mode === "accumulated" ? accumulatedTotal : week.totalTokens;
    const paintedCells = getPaintedCellCount(tokens, referenceTotal);

    return buildWeeklyGridItems(week, tokens, paintedCells, mode);
  });
}

function buildWeeklyGridItems(
  week: WeeklyUsageGroup,
  tokens: number,
  paintedCells: number,
  mode: Exclude<UsageViewMode, "daily">
) {
  const tooltipLabel = `${formatCompactTokens(tokens)} tokens ${
    mode === "accumulated" ? "acumulados" : "en la semana"
  } del ${dayFormatter.format(week.firstDay.date)} al ${dayFormatter.format(week.lastDay.date)}`;

  return week.items.map<TokenUsageGridItem>((item) => {
    const row = item.date.getUTCDay();
    const isPainted = paintedCells > 0 && row >= HEATMAP_ROW_COUNT - paintedCells;

    return {
      ...item,
      groupKey: week.key,
      isPainted,
      tooltipLabel,
      tooltipTokens: tokens,
      totalTokens: isPainted ? tokens : 0
    };
  });
}

function buildWeeklyGroups(days: TokenUsageDay[]) {
  const groups = new Map<string, WeeklyUsageGroup>();

  for (const day of days) {
    const weekKey = getWeekKey(day.date);
    const current = groups.get(weekKey);

    if (!current) {
      groups.set(weekKey, {
        firstDay: day,
        items: [day],
        key: weekKey,
        lastDay: day,
        monthKey: day.monthKey,
        totalTokens: day.totalTokens
      });
      continue;
    }

    current.items.push(day);
    current.lastDay = day;
    current.totalTokens += day.totalTokens;
  }

  return [...groups.values()];
}

function getMonthlyTotals(weeks: WeeklyUsageGroup[]) {
  const totals = new Map<string, number>();

  for (const week of weeks) {
    totals.set(week.monthKey, (totals.get(week.monthKey) ?? 0) + week.totalTokens);
  }

  return totals;
}

function getPaintedCellCount(tokens: number, referenceTotal: number) {
  if (tokens <= 0 || referenceTotal <= 0) {
    return 0;
  }

  return Math.min(
    Math.max(1, Math.ceil((tokens / referenceTotal) * HEATMAP_ROW_COUNT)),
    HEATMAP_ROW_COUNT
  );
}

function buildMonthLabels(items: TokenUsageDay[], leadingEmptyCells: number): TokenMonthLabel[] {
  const labels: TokenMonthLabel[] = [];
  const seenMonths = new Set<string>();

  for (const [index, item] of items.entries()) {
    if (seenMonths.has(item.monthKey)) {
      continue;
    }

    seenMonths.add(item.monthKey);
    labels.push({
      column: Math.floor((index + leadingEmptyCells) / HEATMAP_ROW_COUNT) + 1,
      month: monthFormatter.format(item.date)
    });
  }

  return labels;
}

function getHeatmapColumnCount(cellCount: number) {
  return Math.ceil(cellCount / HEATMAP_ROW_COUNT);
}

function getMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getWeekKey(date: Date) {
  const weekStart = new Date(date);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  return weekStart.toISOString().slice(0, 10);
}
