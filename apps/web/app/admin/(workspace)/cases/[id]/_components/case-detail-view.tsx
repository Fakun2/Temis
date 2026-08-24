import { CaseDetailSummary } from "../../_components/detail/case-detail-summary";
import { CaseDocumentsPanel } from "../../_components/detail/case-documents-panel";
import { CaseExpensesTable } from "../../_components/detail/case-expenses-table";
import { CaseHearingsTable } from "../../_components/detail/case-hearings-table";
import { CaseExpensesBreakdownCard } from "../../_components/detail/paid-expenses-breakdown";
import { CaseTasksTable } from "../../_components/detail/tasks-table";
import type { CaseDetailDto } from "../../_types/cases.types";
import { CaseAiPanel } from "./ai/case-ai-panel";
import type {
  CaseDetailCalendarTarget,
  CaseDetailPermissions
} from "../_types/case-detail-page.types";

export function CaseDetailView({
  calendarTarget,
  caseItem,
  permissions
}: {
  calendarTarget?: CaseDetailCalendarTarget;
  caseItem: CaseDetailDto;
  permissions: CaseDetailPermissions;
}) {
  const focusedExpenseId = calendarTarget?.focus === "expense" ? calendarTarget.eventId : null;
  const focusedHearingId = calendarTarget?.focus === "hearing" ? calendarTarget.eventId : null;
  const focusedTaskId = calendarTarget?.focus === "task" ? calendarTarget.eventId : null;

  return (
    <div className="flex min-h-[calc(100svh-104px)] flex-col gap-4 overflow-visible md:min-h-[calc(100svh-112px)] md:gap-5">
      <CaseDetailSummary caseItem={caseItem} />
      <CaseAiPanel canUseAi={permissions.canUseCaseAi} caseItem={caseItem} />
      <section className="min-h-0 scroll-mt-24 flex-1 overflow-visible" id="tasks">
        <CaseTasksTable
          canCreate={permissions.canCreateTask}
          canCreateExpense={permissions.canCreateExpense}
          canDelete={permissions.canDeleteTask}
          canDeleteExpense={permissions.canDeleteExpense}
          canReadExpense={permissions.canReadExpense}
          canUpdate={permissions.canUpdateTask}
          canUpdateExpense={permissions.canUpdateExpense}
          caseId={caseItem.id}
          focusedTaskId={focusedTaskId}
        />
      </section>
      <section className="min-h-0 scroll-mt-24 flex-1 overflow-visible" id="hearings">
        <CaseHearingsTable
          canCreate={permissions.canCreateHearing}
          canDelete={permissions.canDeleteHearing}
          canUpdate={permissions.canUpdateHearing}
          caseId={caseItem.id}
          focusedHearingId={focusedHearingId}
        />
      </section>
      <section className="min-h-0 flex-1 overflow-visible">
        <CaseDocumentsPanel
          canRead={permissions.canReadDocument}
          canWrite={permissions.canWriteDocument}
          caseId={caseItem.id}
        />
      </section>
      <section
        className="grid scroll-mt-24 gap-6 overflow-visible lg:grid-cols-[minmax(0,1fr)_340px]"
        id="expenses"
      >
        {/* <CalendarCard
          canCreateExpense={permissions.canCreateExpense}
          canCreateHearing={permissions.canCreateHearing}
          canCreateTask={permissions.canCreateTask}
          canUpdateExpense={permissions.canUpdateExpense}
          caseId={caseItem.id}
        /> */}
        <CaseExpensesTable
          canCreate={permissions.canCreateExpense}
          canDelete={permissions.canDeleteExpense}
          canRead={permissions.canReadExpense}
          canUpdate={permissions.canUpdateExpense}
          caseId={caseItem.id}
          focusedExpenseId={focusedExpenseId}
        />
        <CaseExpensesBreakdownCard
          canReadExpense={permissions.canReadExpense}
          caseId={caseItem.id}
        />
      </section>
    </div>
  );
}
