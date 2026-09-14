"use client";

import { cn } from "@/lib/utils";
import type { TasksBoardViewModeOption } from "../../task-list-types";
import { boardViewOptions } from "../settings-options";

export function BoardViewSelector({
  activeViewMode,
  onSelect
}: {
  activeViewMode: TasksBoardViewModeOption;
  onSelect: (mode: TasksBoardViewModeOption) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {boardViewOptions.map((option) => {
        const Icon = option.icon;
        const active = option.value === activeViewMode;

        return (
          <button
            className={cn(
              "grid h-12 place-items-center rounded-md border border-border/50 bg-background/45 text-[10px] text-muted-foreground transition-colors",
              active && "border-primary text-primary ring-1 ring-primary"
            )}
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
