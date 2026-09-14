"use client";

import Link from "next/link";
import { formatCaseDate } from "../../../../cases/_components/detail/case-detail-format";
import type { GlobalCaseTaskDto } from "../../../../cases/_types/cases.types";
import { BoardMessage } from "../shared/board-message";
import { getCalendarAnchor, getMonthDays, groupTasksByDay, toDateKey } from "../shared/date-utils";

export function TasksBoardCalendar({
  error,
  isLoading,
  tasks
}: {
  error: Error | null;
  isLoading: boolean;
  tasks: GlobalCaseTaskDto[];
}) {
  const anchor = getCalendarAnchor(tasks);
  const days = getMonthDays(anchor);
  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).format(anchor);
  const tasksByDay = groupTasksByDay(tasks);

  if (!isLoading && error) {
    return <BoardMessage message={error.message} tone="error" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3">
        <h3 className="text-sm font-semibold capitalize text-foreground">{monthLabel}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length} tareas</span>
      </div>
      <div className="grid shrink-0 grid-cols-7 border-b border-border/40 bg-muted/20 text-center text-[11px] font-medium text-muted-foreground">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
          <div className="px-2 py-2" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 overflow-auto scrollbar-none">
        {days.map((day) => {
          const dayTasks = day.date ? tasksByDay.get(toDateKey(day.date)) ?? [] : [];

          return (
            <div className="min-h-28 border-b border-r border-border/30 p-2" key={day.key}>
              {day.date ? (
                <>
                  <span className="text-xs font-medium text-muted-foreground">
                    {day.date.getUTCDate()}
                  </span>
                  <div className="mt-2 grid gap-1">
                    {isLoading ? (
                      <span className="h-6 animate-pulse rounded-md bg-muted" />
                    ) : (
                      dayTasks.slice(0, 3).map((task) =>
                        task.case ? (
                          <Link
                            className="truncate rounded-md bg-secondary/60 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                            href={`/admin/cases/${task.case.id}`}
                            key={task.id}
                            title={`${task.name} - ${formatCaseDate(task.endDate)}`}
                          >
                            {task.name}
                          </Link>
                        ) : (
                          <span
                            className="truncate rounded-md bg-secondary/60 px-2 py-1 text-[11px] font-medium text-foreground"
                            key={task.id}
                            title={`${task.name} - ${formatCaseDate(task.endDate)}`}
                          >
                            {task.name}
                          </span>
                        )
                      )
                    )}
                    {dayTasks.length > 3 ? (
                      <span className="text-[11px] text-muted-foreground">
                        +{dayTasks.length - 3} mas
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
