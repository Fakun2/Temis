"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import { getMonthLabel } from "../../_utils/calendar-date-utils";
import {
  CalendarEmptyDayActions,
  type CalendarCreateEventType
} from "./empty-day-actions";
import { CalendarEventList } from "./event-list";
import { CalendarMonthGrid } from "./month-grid";
import { CalendarError, CalendarMessage, CalendarSkeleton } from "./states";
import { CalendarToolbar } from "./toolbar";
import { useCalendarCard } from "../../_hooks/use-calendar-card";
import { CaseExpenseSheet } from "../../../cases/_components/detail/expense-sheet";
import { CaseHearingSheet } from "../../../cases/_components/detail/hearing-sheet";
import { CaseTaskSheet } from "../../../cases/_components/detail/task-sheet";
import type { CalendarCardProps } from "../../_types/calendar.types";

export function CalendarCard({
  canCreateExpense,
  canCreateHearing,
  canCreateTask,
  caseId,
  caseFiltersDisabled,
  onClearCaseFilter,
  onSelectCaseFilter,
  selectedCase = null,
  scope = "case"
}: CalendarCardProps) {
  const [createAction, setCreateAction] = useState<{
    date: string;
    day: number;
    open: boolean;
  } | null>(null);
  const [activeCreateSheet, setActiveCreateSheet] = useState<CalendarCreateEventType | null>(null);
  const openSheetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendar = useCalendarCard({
    canCreateTask,
    caseId,
    scope,
    taskSheetOpen: activeCreateSheet === "task"
  });
  const createDate = createAction?.date;

  useEffect(() => {
    return () => {
      if (openSheetTimerRef.current) {
        clearTimeout(openSheetTimerRef.current);
      }
    };
  }, []);

  const openCreateActions = useCallback((date: string, day: number) => {
    setCreateAction({ date, day, open: true });
  }, []);

  function setCreateActionsOpen(open: boolean) {
    setCreateAction((current) => (current ? { ...current, open } : current));
  }

  function openCreateSheet(type: CalendarCreateEventType) {
    setCreateActionsOpen(false);

    if (openSheetTimerRef.current) {
      clearTimeout(openSheetTimerRef.current);
    }

    openSheetTimerRef.current = setTimeout(() => {
      setActiveCreateSheet(type);
      openSheetTimerRef.current = null;
    }, 0);
  }

  function handleCreateSheetOpenChange(open: boolean) {
    if (!open) {
      setActiveCreateSheet(null);
    }
  }

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} min-h-[380px] overflow-visible border-0 shadow-[var(--admin-card-shadow)]`}
    >
      <CalendarToolbar
        eventCount={calendar.visibleEventsCount}
        caseFiltersDisabled={caseFiltersDisabled}
        monthLabel={getMonthLabel(calendar.month)}
        onClearCaseFilter={onClearCaseFilter}
        onClearTypes={calendar.clearEventTypes}
        onGoToday={calendar.goToToday}
        onNavigate={calendar.navigateMonth}
        onSelectCaseFilter={onSelectCaseFilter}
        onToggleType={calendar.toggleEventType}
        onViewChange={calendar.setView}
        selectedCase={selectedCase}
        view={calendar.view}
        visibleTypes={calendar.visibleEventTypes}
      />
      <CardContent className="grid gap-3 px-4 pb-4 md:px-5">
        {calendar.calendarQuery.isLoading && !calendar.calendarQuery.data ? (
          <CalendarSkeleton />
        ) : calendar.calendarQuery.error ? (
          <CalendarError message={calendar.calendarQuery.error.message} />
        ) : !calendar.calendarQuery.hasPermission ? (
          <CalendarMessage message="No tenes permisos para ver vencimientos del expediente." />
        ) : calendar.view === "month" ? (
          <CalendarMonthGrid
            canCreateExpense={canCreateExpense}
            canCreateHearing={canCreateHearing}
            canCreateTask={canCreateTask}
            events={calendar.visibleMonthEvents}
            isFetching={calendar.calendarQuery.isFetching}
            isEventSelectable={calendar.canSelectCalendarEvent}
            month={calendar.month}
            onCreateRequest={openCreateActions}
            onEventSelect={calendar.selectCalendarEvent}
          />
        ) : (
          <CalendarEventList
            canGoBack={calendar.calendarListPagination.canGoBack}
            canGoForward={calendar.calendarListPagination.canGoForward}
            events={calendar.visibleListEvents}
            goBack={calendar.calendarListPagination.goBack}
            goForward={calendar.calendarListPagination.goForward}
            isEventSelectable={calendar.canSelectCalendarEvent}
            onEventSelect={calendar.selectCalendarEvent}
            pageIndex={calendar.calendarListPagination.pageIndex}
            totalEvents={calendar.visibleEventsCount}
          />
        )}
      </CardContent>
      {createAction ? (
        <CalendarEmptyDayActions
          canCreateExpense={canCreateExpense}
          canCreateHearing={canCreateHearing}
          canCreateTask={canCreateTask}
          date={createAction.date}
          day={createAction.day}
          onCreate={openCreateSheet}
          open={createAction.open}
          onOpenChange={setCreateActionsOpen}
        />
      ) : null}
      {canCreateExpense && createDate ? (
        <CaseExpenseSheet
          caseId={caseId}
          selectedCase={selectedCase}
          defaultDate={createDate}
          hideTaskSelect
          onOpenChange={handleCreateSheetOpenChange}
          open={activeCreateSheet === "expense"}
          tasks={[]}
        />
      ) : null}
      {canCreateTask && createDate ? (
        <CaseTaskSheet
          assignees={calendar.assignees}
          caseId={caseId}
          selectedCase={selectedCase}
          defaultDate={createDate}
          onOpenChange={handleCreateSheetOpenChange}
          open={activeCreateSheet === "task"}
        />
      ) : null}
      {canCreateHearing && createDate ? (
        <CaseHearingSheet
          caseId={caseId}
          selectedCase={selectedCase}
          defaultDate={createDate}
          onOpenChange={handleCreateSheetOpenChange}
          open={activeCreateSheet === "hearing"}
        />
      ) : null}
    </Card>
  );
}
