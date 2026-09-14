"use client";

import { cn } from "@/lib/utils";
import type { TasksKanbanCardLayout } from "../task-list-types";
import { SettingsSectionLabel } from "./settings-primitives";

export function KanbanCardLayoutSelector({
  activeLayout,
  onLayoutChange
}: {
  activeLayout: TasksKanbanCardLayout;
  onLayoutChange: (layout: TasksKanbanCardLayout) => void;
}) {
  return (
    <div className="grid gap-1">
      <SettingsSectionLabel>Diseno de tarjeta</SettingsSectionLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <KanbanCardLayoutOption
          active={activeLayout === "compact"}
          label="Compacto"
          layout="compact"
          onSelect={onLayoutChange}
        />
        <KanbanCardLayoutOption
          active={activeLayout === "list"}
          label="Lista"
          layout="list"
          onSelect={onLayoutChange}
        />
      </div>
    </div>
  );
}

function KanbanCardLayoutOption({
  active,
  label,
  layout,
  onSelect
}: {
  active: boolean;
  label: string;
  layout: TasksKanbanCardLayout;
  onSelect: (layout: TasksKanbanCardLayout) => void;
}) {
  return (
    <button
      className={cn(
        "grid gap-1.5 rounded-md border border-border/50 bg-background/45 p-1.5 text-center text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50",
        active && "border-primary text-primary ring-1 ring-primary"
      )}
      type="button"
      onClick={() => onSelect(layout)}
    >
      <span className="grid h-9 gap-1 rounded bg-secondary/40 p-1.5">
        <span className="h-1.5 w-full rounded bg-primary/20" />
        {layout === "compact" ? (
          <>
            <span className="h-1 w-4/5 rounded bg-muted-foreground/20" />
            <span className="h-1 w-3/5 rounded bg-muted-foreground/20" />
          </>
        ) : (
          <span className="h-4 w-full rounded bg-muted-foreground/20" />
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
