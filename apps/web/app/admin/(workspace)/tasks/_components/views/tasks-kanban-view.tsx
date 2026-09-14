"use client";

import { Input } from "@/components/ui/input";
import { useTasksContext } from "../../_context/tasks-context";
import { TasksBoardContent } from "../board/tasks-board-content";
import { TasksToolbar } from "../layout/tasks-toolbar";

export function TasksKanbanView() {
  const { boardMutationError, boardName, updateBoardName } = useTasksContext();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Input
              className="h-12 min-w-0 border-0 !bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl"
              value={boardName}
              onChange={(event) => updateBoardName(event.target.value)}
              aria-label="Nombre del tablero"
            />
          </div>
        </div>

        <TasksToolbar />
        {boardMutationError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {boardMutationError.message}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 pt-3">
        <TasksBoardContent />
      </div>
    </div>
  );
}
