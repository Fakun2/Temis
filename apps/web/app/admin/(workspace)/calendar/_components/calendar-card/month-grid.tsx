import { memo, useMemo } from "react";
import type { CaseCalendarEventDto } from "../../../cases/_types/cases.types";
import { CalendarDay } from "./calendar-day";
import { calendarPanelClassName } from "../../_constants/calendar.constants";
import { getCalendarDays, groupEventsByDate } from "../../_utils/calendar-date-utils";

const weekDays = ["D", "L", "M", "M", "J", "V", "S"];

function CalendarMonthGridComponent({
  canCreateExpense,
  canCreateHearing,
  canCreateTask,
  events,
  isFetching,
  isEventSelectable,
  month,
  onCreateRequest,
  onEventSelect
}: {
  canCreateExpense: boolean;
  canCreateHearing: boolean;
  canCreateTask: boolean;
  events: CaseCalendarEventDto[];
  isFetching: boolean;
  isEventSelectable: (event: CaseCalendarEventDto) => boolean;
  month: string;
  onCreateRequest: (date: string, day: number) => void;
  onEventSelect: (event: CaseCalendarEventDto) => void;
}) {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);

  return (
    <section className={`grid gap-2 ${calendarPanelClassName}`} aria-label="Vista mensual del calendario">
      <ol className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {weekDays.map((day, index) => (
          <li className="py-1" key={`${day}-${index}`}>
            {day}
          </li>
        ))}
      </ol>
      <section className="relative" aria-label="Dias del mes">
        <ol className="grid grid-cols-7 overflow-visible rounded-xl border-b border-l border-border/35">
          {days.map((day, index) => (
            <CalendarDay
              canCreateExpense={canCreateExpense}
              canCreateHearing={canCreateHearing}
              canCreateTask={canCreateTask}
              date={day.date}
              day={day.day}
              events={eventsByDate[day.date] ?? []}
              inCurrentMonth={day.inCurrentMonth}
              isEventSelectable={isEventSelectable}
              key={`${day.date}-${index}`}
              onCreateRequest={onCreateRequest}
              onEventSelect={onEventSelect}
            />
          ))}
        </ol>
        {isFetching ? <CalendarFetchingOverlay /> : null}
      </section>
    </section>
  );
}

export const CalendarMonthGrid = memo(CalendarMonthGridComponent);

function CalendarFetchingOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-xl bg-card/45 backdrop-blur-[1px]"
      aria-hidden="true"
    >
      <span className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted/70">
        <span className="block h-full w-1/3 animate-[calendar-loading_1.1s_ease-in-out_infinite] rounded-full bg-foreground/20" />
      </span>
    </div>
  );
}
