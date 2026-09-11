"use client";

import { memo, useCallback, useState, type CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TOKEN_USAGE_MODE_LABELS, TOKEN_USAGE_MODE_OPTIONS } from "../constants";
import { useTokenHeatmap } from "../hooks/use-token-heatmap";
import {
  formatCompactTokens,
  getCellAnimationDelay,
  getTokenCellClassName,
  getTokenIntensity
} from "../utils";
import type { AccountAiUsageDay, TokenUsageGridItem, UsageViewMode } from "../types";

export function TokenHeatmap({
  dailyUsage,
  mode,
  onModeChange
}: {
  dailyUsage: AccountAiUsageDay[];
  mode: UsageViewMode;
  onModeChange: (mode: UsageViewMode) => void;
}) {
  const heatmap = useTokenHeatmap(dailyUsage, mode);
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  const handleGroupHover = useCallback((groupKey: string | undefined) => {
    if (!groupKey) {
      return;
    }

    setHoveredGroupKey((currentGroupKey) =>
      currentGroupKey === groupKey ? currentGroupKey : groupKey
    );
  }, []);
  const handleGroupClear = useCallback(() => setHoveredGroupKey(null), []);

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold leading-none text-foreground">Uso de tokens</h3>
        <div className="flex flex-wrap items-center justify-end gap-4 text-sm leading-none">
          {TOKEN_USAGE_MODE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                "font-normal transition-colors",
                mode === option ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onModeChange(option)}
            >
              {TOKEN_USAGE_MODE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <TooltipProvider delayDuration={40} skipDelayDuration={0}>
        <div className="overflow-x-auto pb-1 scrollbar-none" onPointerLeave={handleGroupClear}>
          <div className="grid min-w-[760px] gap-3">
            <div
              className="grid grid-flow-col grid-rows-7 gap-1"
              style={{
                gridTemplateColumns: `repeat(${heatmap.columnCount}, minmax(0, 1fr))`
              }}
            >
              {heatmap.cells.map((item, index) => {
                const row = index % 7;
                const column = Math.floor(index / 7);
                const animationDelay = getCellAnimationDelay(column, row);

                return item ? (
                  <TokenHeatmapCell
                    key={`${mode}-${item.key}`}
                    animationDelay={animationDelay}
                    highlighted={Boolean(item.groupKey && item.groupKey === hoveredGroupKey)}
                    item={item}
                    maxTokens={heatmap.maxTokens}
                    onGroupClear={handleGroupClear}
                    onGroupHover={handleGroupHover}
                  />
                ) : (
                  <span
                    key={`empty-${index}`}
                    className="block aspect-square rounded-[4px]"
                    style={{ "--token-cell-delay": `${animationDelay}ms` } as CSSProperties}
                  />
                );
              })}
            </div>

            <div
              className="grid gap-1 text-sm text-muted-foreground"
              style={{
                gridTemplateColumns: `repeat(${heatmap.columnCount}, minmax(0, 1fr))`
              }}
            >
              {heatmap.monthLabels.map((label) => (
                <span
                  key={`${label.month}-${label.column}`}
                  style={{ gridColumnStart: label.column }}
                >
                  {label.month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </section>
  );
}

const TokenHeatmapCell = memo(function TokenHeatmapCell({
  animationDelay,
  highlighted,
  item,
  maxTokens,
  onGroupClear,
  onGroupHover
}: {
  animationDelay: number;
  highlighted: boolean;
  item: TokenUsageGridItem;
  maxTokens: number;
  onGroupClear: () => void;
  onGroupHover: (groupKey: string | undefined) => void;
}) {
  const intensity = item.isPainted ? 3 : getTokenIntensity(item.totalTokens, maxTokens);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "block size-[13px] rounded-[4px] transition-transform hover:scale-110 motion-safe:animate-[temis-token-cell-reveal_520ms_cubic-bezier(0.45,0,0.18,1)_both] motion-safe:[animation-delay:var(--token-cell-delay)]",
            item.isPainted ? "bg-[#5f8fdc]" : getTokenCellClassName(intensity),
            highlighted &&
              (item.isPainted
                ? "scale-110 ring-1 ring-[#5f8fdc]/45 ring-offset-1 ring-offset-background"
                : "scale-110 bg-[#d9e6f8] ring-1 ring-[#5f8fdc]/35 ring-offset-1 ring-offset-background")
          )}
          style={{ "--token-cell-delay": `${animationDelay}ms` } as CSSProperties}
          aria-label={item.tooltipLabel}
          onBlur={onGroupClear}
          onFocus={() => onGroupHover(item.groupKey)}
          onPointerEnter={() => onGroupHover(item.groupKey)}
        />
      </TooltipTrigger>
      <TooltipContent>
        <span>
          {item.groupKey
            ? item.tooltipLabel
            : `${item.tooltipLabel} (${formatCompactTokens(item.inputTokens)} entrada / ${formatCompactTokens(
                item.outputTokens
              )} salida)`}
        </span>
      </TooltipContent>
    </Tooltip>
  );
});
