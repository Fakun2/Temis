import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  caseExpenseStatusLabels,
  caseHearingTypeLabels
} from "../../../cases/_constants/cases.constants";
import type { CaseCalendarEventDto } from "../../../cases/_types/cases.types";
import {
  formatCaseDate,
  formatCaseMoney,
  getExpenseStatusClassName
} from "../../../cases/_components/detail/case-detail-format";
import {
  calendarPanelClassName,
  calendarEventTypeDotClassNames,
  calendarEventTypeShortLabels
} from "../../_constants/calendar.constants";

export function CalendarEventList({
  canGoBack,
  canGoForward,
  events,
  goBack,
  goForward,
  isEventSelectable,
  onEventSelect,
  pageIndex,
  totalEvents
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  events: CaseCalendarEventDto[];
  goBack: () => void;
  goForward: () => void;
  isEventSelectable: (event: CaseCalendarEventDto) => boolean;
  onEventSelect: (event: CaseCalendarEventDto) => void;
  pageIndex: number;
  totalEvents: number;
}) {
  if (!events.length) {
    return (
      <p className={`flex ${calendarPanelClassName} items-center justify-center rounded-2xl border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground`}>
        No hay eventos para los filtros seleccionados.
      </p>
    );
  }

  return (
    <section
      className={`grid ${calendarPanelClassName} grid-rows-[1fr_auto] overflow-hidden rounded-2xl border border-border/40`}
      aria-label="Eventos del calendario"
    >
      <ul className="grid min-h-0 content-start gap-2 overflow-auto p-2">
        {events.map((event) => {
          const selectable = isEventSelectable(event);

          return (
            <li key={`${event.type}-${event.id}`}>
              <button
                type="button"
                className="grid min-h-[58px] w-full gap-2 rounded-xl border border-border/40 bg-card px-3 py-2.5 text-left shadow-[0_10px_24px_-24px_rgba(15,23,42,0.45)] transition-colors hover:bg-secondary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-card sm:grid-cols-[112px_1fr_auto] sm:items-center sm:px-4"
                disabled={!selectable}
                onClick={() => onEventSelect(event)}
              >
                <time className="text-sm font-medium text-muted-foreground" dateTime={event.date}>
                  {formatCaseDate(event.date)}
                </time>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${calendarEventTypeDotClassNames[event.type]}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {event.title}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {event.caseNumber
                      ? `${event.caseNumber} - ${event.caseCaption ?? "Expediente"}`
                      : calendarEventTypeShortLabels[event.type]}
                  </span>
                </span>
                <EventListMeta event={event} />
              </button>
            </li>
          );
        })}
      </ul>
      <CalendarEventListPagination
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        eventCount={events.length}
        goBack={goBack}
        goForward={goForward}
        page={pageIndex + 1}
        totalEvents={totalEvents}
      />
    </section>
  );
}

function CalendarEventListPagination({
  canGoBack,
  canGoForward,
  eventCount,
  goBack,
  goForward,
  page,
  totalEvents
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  eventCount: number;
  goBack: () => void;
  goForward: () => void;
  page: number;
  totalEvents: number;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border/35 px-4 py-2 text-xs text-muted-foreground">
      <span>
        Pagina {page} - {eventCount} de {totalEvents} eventos
      </span>
      <nav className="flex gap-2" aria-label="Paginacion de eventos del calendario">
        <Button
          type="button"
          variant="outline"
          className="h-7 w-7 rounded-xl border-border/50 p-0"
          disabled={!canGoBack}
          onClick={goBack}
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 w-7 rounded-xl border-border/50 p-0"
          disabled={!canGoForward}
          onClick={goForward}
          aria-label="Pagina siguiente"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </nav>
    </footer>
  );
}

function EventListMeta({ event }: { event: CaseCalendarEventDto }) {
  if (event.type === "hearing") {
    return (
      <Badge variant="outline">
        {event.time ? `${event.time} · ` : ""}
        {event.hearingType ? caseHearingTypeLabels[event.hearingType] : "Audiencia"}
      </Badge>
    );
  }

  if (event.type === "task_due") {
    return (
      <Badge variant="outline">
        {event.status === "in_progress" ? "En curso" : "Pendiente"}
      </Badge>
    );
  }

  return (
    <span className="flex items-center gap-2 sm:justify-end">
      <span className="text-sm font-semibold text-foreground">
        {event.amount ? formatCaseMoney(event.amount, event.currencyCode) : "Sin monto"}
      </span>
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getExpenseStatusClassName(
          event.status === "overdue" ? "overdue" : "pending"
        )}`}
      >
        {caseExpenseStatusLabels[event.status === "overdue" ? "overdue" : "pending"]}
      </span>
    </span>
  );
}
