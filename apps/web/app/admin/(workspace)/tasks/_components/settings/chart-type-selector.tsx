"use client";

import { cn } from "@/lib/utils";
import type { TasksBoardChartType } from "../task-list-types";
import { chartTypeOptions } from "./settings-options";
import { SettingsSectionLabel } from "./settings-primitives";

export function ChartTypeSelector({
  activeChartType,
  onChartTypeChange
}: {
  activeChartType: TasksBoardChartType;
  onChartTypeChange: (chartType: TasksBoardChartType) => void;
}) {
  return (
    <div className="grid gap-1">
      <SettingsSectionLabel>Tipo de grafico</SettingsSectionLabel>
      <div className="grid grid-cols-4 gap-1">
        {chartTypeOptions.map((option) => {
          const Icon = option.icon;
          const active = option.value === activeChartType;

          return (
            <button
              aria-label={option.label}
              className={cn(
                "grid h-9 place-items-center rounded-md border border-border/50 bg-background/45 text-muted-foreground transition-colors hover:bg-secondary/50",
                active && "border-primary text-primary ring-1 ring-primary"
              )}
              key={option.value}
              title={option.label}
              type="button"
              onClick={() => onChartTypeChange(option.value)}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
