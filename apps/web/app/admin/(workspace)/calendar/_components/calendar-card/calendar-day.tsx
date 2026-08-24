"use client";

import { memo, useMemo, useState } from "react";
import type { CaseCalendarEventDto } from "../../../cases/_types/cases.types";
import {
  calendarEventTypeDotClassNames,
  type CalendarEventType
} from "../../_constants/calendar.constants";
import { CalendarDayTooltip } from "./calendar-day-tooltip";

const calendarEventTypeIndicatorOrder: CalendarEventType[] = [
  "payment_due",
  "task_due",
  "hearing"
];

function CalendarDayComponent({
  canCreateExpense,
  canCreateHearing,
  canCreateTask,
  date,
  day,
  events,
  inCurrentMonth,
  isEventSelectable,
  onCreateRequest,
  onEventSelect
}: {
  canCreateExpense: boolean;
  canCreateHearing: boolean;
  canCreateTask: boolean;
  date: string;
  day: number;
  events: CaseCalendarEventDto[];
  inCurrentMonth: boolean;
  isEventSelectable: (event: CaseCalendarEventDto) => boolean;
  onCreateRequest: (date: string, day: number) => void;
  onEventSelect: (event: CaseCalendarEventDto) => void;
}) {
  const hasEvents = events.length > 0;
  const [open, setOpen] = useState(false);
  const canOpenActionsOnDay =
    inCurrentMonth && (canCreateExpense || canCreateHearing || canCreateTask);
  const visibleEventTypes = useMemo(() => {
    const eventTypes = new Set(events.map((event) => event.type));

    return calendarEventTypeIndicatorOrder.filter((eventType) => eventTypes.has(eventType));
  }, [events]);
  const hiddenEventsCount = Math.max(events.length - visibleEventTypes.length, 0);

  function openCreateActions() {
    if (canOpenActionsOnDay) {
      onCreateRequest(date, day);
    }
  }

  return (
    <li className="relative min-h-12">
      <button
        type="button"
        aria-expanded={hasEvents ? open : undefined}
        className={`relative flex h-12 w-full items-center justify-center border-r border-t border-border/35 text-sm transition-colors hover:bg-secondary/35 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
          hasEvents && inCurrentMonth
            ? "font-semibold text-foreground"
            : inCurrentMonth
              ? "text-muted-foreground"
              : "text-muted-foreground/45"
        }`}
        onClick={() => {
          if (hasEvents) {
            setOpen((currentOpen) => !currentOpen);
            return;
          }

          openCreateActions();
        }}
        onDoubleClick={() => {
          if (hasEvents) {
            setOpen(false);
            openCreateActions();
          }
        }}
      >
        {day}
        {hasEvents ? (
          <span
            className="absolute bottom-1.5 right-1.5 flex max-w-[calc(100%-0.75rem)] items-center justify-end gap-0.5"
            aria-hidden="true"
          >
            {visibleEventTypes.map((eventType) => (
              <span
                className={`h-1.5 w-1.5 rounded-full shadow-[0_0_0_1px_hsl(var(--background))] ${calendarEventTypeDotClassNames[eventType]}`}
                key={eventType}
              />
            ))}
            {hiddenEventsCount > 0 ? (
              <span className="ml-0.5 text-[0.625rem] font-semibold leading-none text-muted-foreground">
                +{hiddenEventsCount}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
      {hasEvents && open ? (
        <CalendarDayTooltip
          date={date}
          events={events}
          isEventSelectable={isEventSelectable}
          onEventSelect={onEventSelect}
        />
      ) : null}
    </li>
  );
}

export const CalendarDay = memo(CalendarDayComponent);
