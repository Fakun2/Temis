"use client";

import type { DragEvent } from "react";
import { CalendarClock, CheckCircle2, CircleDashed, Clock3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CaseTaskSheet } from "../../../cases/_components/detail/task-sheet";
import type {
  GlobalCaseTaskDto,
  TaskBoardVisibleProperty,
  TaskAssigneeOption
} from "../../../cases/_types/cases.types";
import type { KanbanColumn } from "../../_utils/task-kanban";
import { useTasksContext } from "../../_context/tasks-context";
import { getYesterdayDateKey } from "../board/shared/date-utils";
import { TaskKanbanCard } from "./task-kanban-card";

const columnIcons: Record<KanbanColumn["id"], typeof CircleDashed> = {
  done: CheckCircle2,
  in_progress: Clock3,
  overdue: CalendarClock,
  todo: CircleDashed
};

export function TaskKanbanColumn({
  assignees,
  canCreate,
  canDelete,
  canUpdate,
  column,
  isLoading,
  isMoving,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  tasks,
  visibleProperties
}: {
  assignees: TaskAssigneeOption[];
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  column: KanbanColumn;
  isLoading: boolean;
  isMoving: boolean;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, column: KanbanColumn) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, column: KanbanColumn) => void;
  tasks: GlobalCaseTaskDto[];
  visibleProperties: TaskBoardVisibleProperty[];
}) {
  const { boardSettings } = useTasksContext();
  const Icon = columnIcons[column.id];
  const isEmpty = !isLoading && tasks.length === 0;
  const skeletonHeights = ["h-32", "h-28", "h-36", "h-24"];
  const coloredColumn = boardSettings.kanbanColorColumns;

  return (
    <div
      className={cn(
        "flex h-fit min-w-0 flex-col self-start rounded-2xl text-[var(--task-kanban-column-fg)]",
        coloredColumn ? "bg-[var(--task-kanban-column-bg)]" : "bg-transparent",
        isEmpty ? "min-h-[140px]" : "min-h-[280px]"
      )}
      data-task-kanban-column={coloredColumn ? column.id : "neutral"}
      onDragOver={(event) => onDragOver(event, column)}
      onDrop={(event) => onDrop(event, column)}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-[var(--task-kanban-column-title)]">
            {column.title}
          </span>
        </div>
      </div>

      <div className={`flex flex-col p-2 ${isEmpty ? "min-h-4" : "min-h-[156px]"}`}>
        {isLoading ? (
          <div className="grid gap-2">
            {skeletonHeights.map((height, index) => (
              <TaskKanbanCardSkeleton height={height} key={index} />
            ))}
          </div>
        ) : null}

        {!isLoading && tasks.length > 0 ? (
          <div className="grid gap-2">
            {tasks.map((task) => (
              <TaskKanbanCard
                assignees={assignees}
                canDelete={canDelete}
                canUpdate={canUpdate}
                isMoving={isMoving}
                key={task.id}
                onDragStart={(event) => onDragStart(event, task.id)}
                onDragEnd={onDragEnd}
                task={task}
                visibleProperties={visibleProperties}
              />
            ))}
          </div>
        ) : null}
      </div>

      {!isLoading && canCreate ? (
        <div className="shrink-0 p-2 pt-0">
          <CaseTaskSheet
            assignees={assignees}
            defaultDate={column.id === "overdue" ? getYesterdayDateKey() : undefined}
            defaultStatus={column.status ?? "pending"}
            presentation={boardSettings.openTaskIn === "center_modal" ? "dialog" : "sheet"}
            trigger={
              <Button
                className="h-14 w-full justify-start gap-2 rounded-xl border border-[var(--task-kanban-add-border)] bg-[var(--task-kanban-add-bg)] px-4 text-sm font-medium text-[var(--task-kanban-add-fg)] shadow-none hover:bg-[var(--task-kanban-add-hover-bg)] hover:text-[var(--task-kanban-add-fg)]"
                type="button"
                variant="outline"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva tarea
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function TaskKanbanCardSkeleton({ height }: { height: string }) {
  return (
    <div
      className={`${height} rounded-xl border border-border/40 bg-[var(--task-kanban-skeleton-bg)] p-3 shadow-sm`}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-2">
          <span className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          <span className="h-3 w-3/5 animate-pulse rounded bg-muted/80" />
        </div>
        <span className="size-8 animate-pulse rounded-lg bg-muted/80" />
      </div>
      <div className="mt-5 grid gap-2.5">
        <span className="h-3 w-2/3 animate-pulse rounded bg-muted/80" />
        <span className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
        <span className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
      </div>
    </div>
  );
}
