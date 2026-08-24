import type { BogaapSession } from "@/lib/auth/session";

export type CaseDetailPermissions = {
  canCreateExpense: boolean;
  canCreateHearing: boolean;
  canCreateTask: boolean;
  canDeleteExpense: boolean;
  canDeleteHearing: boolean;
  canDeleteTask: boolean;
  canReadExpense: boolean;
  canReadDocument: boolean;
  canReadHearing: boolean;
  canReadCase: boolean;
  canUseCaseAi: boolean;
  canWriteDocument: boolean;
  canUpdateExpense: boolean;
  canUpdateHearing: boolean;
  canUpdateTask: boolean;
};

export type CaseDetailSession = NonNullable<BogaapSession>;

export type CaseDetailCalendarFocus = "expense" | "hearing" | "task";

export type CaseDetailCalendarTarget = {
  eventId: string;
  focus: CaseDetailCalendarFocus;
} | null;
