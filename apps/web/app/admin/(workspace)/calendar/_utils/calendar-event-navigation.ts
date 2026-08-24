import type { CaseCalendarEventDto } from "../../cases/_types/cases.types";

type CalendarEventFocus = {
  focus: "expense" | "hearing" | "task";
  section: "expenses" | "hearings" | "tasks";
};

const calendarEventFocusByType: Record<CaseCalendarEventDto["type"], CalendarEventFocus> = {
  hearing: { focus: "hearing", section: "hearings" },
  payment_due: { focus: "expense", section: "expenses" },
  task_due: { focus: "task", section: "tasks" }
};

export function buildCalendarEventHref(
  event: CaseCalendarEventDto,
  fallbackCaseId?: string
) {
  const caseId = event.caseId ?? fallbackCaseId;
  if (!caseId) {
    return null;
  }

  const target = calendarEventFocusByType[event.type];
  const params = new URLSearchParams({
    calendarFocus: target.focus,
    eventId: event.id
  });

  return `/admin/cases/${caseId}?${params.toString()}#${target.section}`;
}
