"use client";

import Link from "next/link";
import type { DragEvent } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCaseDate } from "../../../cases/_components/detail/case-detail-format";
import { CaseTaskRowActions } from "../../../cases/_components/detail/case-task-row-actions";
import { caseTaskStatusLabels } from "../../../cases/_constants/cases.constants";
import type {
  GlobalCaseTaskDto,
  TaskBoardVisibleProperty,
  TaskAssigneeOption
} from "../../../cases/_types/cases.types";
import { getTaskColumn } from "../../_utils/task-kanban";
import { useTasksContext } from "../../_context/tasks-context";

export function TaskKanbanCard({
  assignees,
  canDelete,
  canUpdate,
  isMoving,
  onDragEnd,
  onDragStart,
  task,
  visibleProperties
}: {
  assignees: TaskAssigneeOption[];
  canDelete: boolean;
  canUpdate: boolean;
  isMoving: boolean;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  task: GlobalCaseTaskDto;
  visibleProperties: TaskBoardVisibleProperty[];
}) {
  const { boardSettings } = useTasksContext();
  const cardTone = getTaskColumn(task);
  const properties = new Set(visibleProperties);
  const isListLayout = boardSettings.kanbanCardLayout === "list";
  const cardSizeClassName = getKanbanCardSizeClassName(
    boardSettings.kanbanCardSize,
    isListLayout
  );

  return (
    <article
      className={cn(
        "group w-full min-w-0 max-w-full border border-[var(--task-kanban-card-border)] bg-[var(--task-kanban-card-bg)] text-[var(--task-kanban-card-fg)] shadow-sm transition hover:border-[var(--task-kanban-card-hover-border)] hover:shadow-md",
        isListLayout ? "rounded-lg" : "rounded-xl",
        cardSizeClassName
      )}
      data-task-kanban-card={cardTone}
      draggable={canUpdate && !isMoving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("min-w-0", isListLayout ? "space-y-0.5" : "space-y-1")}>
          <h3
            className={cn(
              "font-medium text-[var(--task-kanban-card-fg)]",
              isListLayout ? "line-clamp-1 text-xs leading-4" : "line-clamp-2 text-sm leading-5"
            )}
          >
            {task.name}
          </h3>
          {properties.has("case") && task.case ? (
            <Link
              className="block max-w-full truncate text-xs font-medium text-[var(--task-kanban-card-muted-fg)] hover:text-[var(--task-kanban-card-link-hover)]"
              href={`/admin/cases/${task.case.id}`}
            >
              {task.case.caseNumber} - {task.case.caption}
            </Link>
          ) : properties.has("case") ? (
            <span className="block max-w-full truncate text-xs text-[var(--task-kanban-card-muted-fg)]">
              Sin expediente
            </span>
          ) : null}
        </div>
        <CaseTaskRowActions
          assignees={assignees}
          canCreateExpense={false}
          canDelete={Boolean(task.caseId && canDelete)}
          canDeleteExpense={false}
          canReadExpense={false}
          canUpdate={canUpdate}
          canUpdateExpense={false}
          caseId={task.caseId ?? undefined}
          task={task}
        />
      </div>

      {visibleProperties.length ? (
        <div
          className={cn(
            "text-[var(--task-kanban-card-muted-fg)]",
            isListLayout
              ? "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
              : "mt-3 grid gap-2 text-xs"
          )}
        >
          {properties.has("client") ? (
            <span className="truncate">{task.client?.displayName ?? "Sin cliente"}</span>
          ) : null}
          {properties.has("assignedTo") ? (
            <span className="truncate">{task.assignedTo?.fullName ?? "Sin asignar"}</span>
          ) : null}
          {properties.has("endDate") ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatCaseDate(task.endDate)}
            </span>
          ) : null}
          {properties.has("status") ? (
            <span className="truncate">{caseTaskStatusLabels[task.status]}</span>
          ) : null}
          {properties.has("notes") && task.notes ? (
            <span className="line-clamp-2">{task.notes}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function getKanbanCardSizeClassName(size: "small" | "medium" | "large", isListLayout: boolean) {
  if (size === "small") {
    return isListLayout ? "px-2.5 py-2" : "p-2.5";
  }

  if (size === "large") {
    return isListLayout ? "px-4 py-3" : "p-4";
  }

  return isListLayout ? "px-3 py-2.5" : "p-3";
}
