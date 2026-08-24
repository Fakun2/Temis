import type { QueryKey } from "@tanstack/react-query";
import type {
  CaseCalendarResponseDto,
  CaseDetailDto,
  CaseDocumentsListResponse,
  CaseExpenseAttachmentsListResponse,
  CaseExpenseDto,
  CaseExpenseStatus,
  CaseExpensesListResponse,
  CaseExpensesSummaryDto,
  CaseHearingsListResponse,
  NotificationOptions,
  CasePickerOptionsQueryParams,
  CasePickerOptionsResponse,
  CaseTasksListResponse,
  CasesListResponse,
  CasesQueryParams,
  CatalogResponse,
  DocumentCategoriesListResponse,
  TaskAssigneeOption
} from "../_types/cases.types";
import {
  caseKeys,
  getCaseCalendar,
  getCaseDetail,
  getCaseExpense,
  getCaseExpensesSummary,
  getTenantCalendar,
  listCaseHearings,
  listCaseExpenseAttachments,
  listCaseExpenses,
  listCases,
  listCasePickerOptions,
  listCaseTasks,
  listCatalogOptions,
  listNotificationOptions,
  listTaskAssignees
} from "./cases.api";
import { listCaseDocuments, listDocumentCategories } from "./case-documents.api";

export type CasesQuerySpec<TData> = {
  enabled?: boolean;
  permission: string;
  queryFn: () => Promise<TData>;
  queryKey: QueryKey;
};

export const casesQueries = {
  list(params: CasesQueryParams): CasesQuerySpec<CasesListResponse> {
    return {
      permission: "cases:read",
      queryKey: caseKeys.list(params),
      queryFn: () => listCases(params)
    };
  },

  pickerOptions(params: CasePickerOptionsQueryParams): CasesQuerySpec<CasePickerOptionsResponse> {
    return {
      permission: "cases:read",
      queryKey: caseKeys.pickerOptions(params),
      queryFn: () => listCasePickerOptions(params)
    };
  },

  detail(caseId: string): CasesQuerySpec<CaseDetailDto> {
    return {
      permission: "cases:read",
      queryKey: caseKeys.detail(caseId),
      queryFn: () => getCaseDetail(caseId)
    };
  },

  catalogOptions<TItem>({
    key,
    params = {},
    path
  }: {
    key: string;
    params?: Record<string, string | number | undefined>;
    path: string;
  }): CasesQuerySpec<CatalogResponse<TItem>> {
    return {
      permission: key === "provinces" ? "provinces:read" : "forums:read",
      queryKey: caseKeys.options(key, params),
      queryFn: () => listCatalogOptions<TItem>({ params, path })
    };
  },

  taskAssignees(): CasesQuerySpec<TaskAssigneeOption[]> {
    return {
      permission: "staff:read",
      queryKey: caseKeys.taskAssignees(),
      queryFn: listTaskAssignees
    };
  },

  notificationOptions(): CasesQuerySpec<NotificationOptions> {
    return {
      permission: "staff:read",
      queryKey: caseKeys.notificationOptions(),
      queryFn: listNotificationOptions
    };
  },

  tasks({
    caseId,
    cursor,
    limit
  }: {
    caseId: string;
    cursor?: string;
    limit: number;
  }): CasesQuerySpec<CaseTasksListResponse> {
    const params = { cursor, limit };

    return {
      permission: "tasks:read",
      queryKey: caseKeys.tasks(caseId, params),
      queryFn: () => listCaseTasks({ caseId, ...params })
    };
  },

  expenses({
    caseId,
    currencyCode,
    cursor,
    limit,
    status,
    taskId
  }: {
    caseId: string;
    currencyCode?: string;
    cursor?: string;
    limit: number;
    status?: CaseExpenseStatus;
    taskId?: string;
  }): CasesQuerySpec<CaseExpensesListResponse> {
    const params = { currencyCode, cursor, limit, status, taskId };

    return {
      permission: "expenses:read",
      queryKey: caseKeys.expenses(caseId, params),
      queryFn: () => listCaseExpenses({ caseId, ...params })
    };
  },

  expense({
    caseId,
    enabled = true,
    expenseId
  }: {
    caseId: string;
    enabled?: boolean;
    expenseId: string;
  }): CasesQuerySpec<CaseExpenseDto> {
    return {
      enabled,
      permission: "expenses:read",
      queryKey: caseKeys.expense(caseId, expenseId),
      queryFn: () => getCaseExpense({ caseId, expenseId })
    };
  },

  expensesSummary(caseId: string): CasesQuerySpec<CaseExpensesSummaryDto> {
    return {
      permission: "expenses:read",
      queryKey: caseKeys.expensesSummary(caseId),
      queryFn: () => getCaseExpensesSummary(caseId)
    };
  },

  hearings({
    caseId,
    cursor,
    limit
  }: {
    caseId: string;
    cursor?: string;
    limit: number;
  }): CasesQuerySpec<CaseHearingsListResponse> {
    const params = { cursor, limit };

    return {
      permission: "hearings:read",
      queryKey: caseKeys.hearings(caseId, params),
      queryFn: () => listCaseHearings({ caseId, ...params })
    };
  },

  calendar({
    caseId,
    cursor,
    enabled,
    limit,
    mode = "month",
    month,
    types
  }: {
    caseId: string;
    cursor?: string;
    enabled?: boolean;
    limit?: number;
    mode?: "month" | "list";
    month: string;
    types?: string;
  }): CasesQuerySpec<CaseCalendarResponseDto> {
    const params = { cursor, limit, mode, month, types };

    return {
      enabled,
      permission: "cases:read",
      queryKey: caseKeys.calendar(caseId, params),
      queryFn: () => getCaseCalendar({ caseId, ...params })
    };
  },

  tenantCalendar({
    caseId,
    cursor,
    enabled,
    limit,
    mode = "month",
    month,
    types
  }: {
    caseId?: string;
    cursor?: string;
    enabled?: boolean;
    limit?: number;
    mode?: "month" | "list";
    month: string;
    types?: string;
  }): CasesQuerySpec<CaseCalendarResponseDto> {
    const params = { caseId, cursor, limit, mode, month, types };

    return {
      enabled,
      permission: "cases:read",
      queryKey: caseKeys.tenantCalendar(params),
      queryFn: () => getTenantCalendar(params)
    };
  },

  documentCategories({
    enabled = true
  }: { enabled?: boolean } = {}): CasesQuerySpec<DocumentCategoriesListResponse> {
    const params = { active: true, limit: 50 };

    return {
      enabled,
      permission: "documents:read",
      queryKey: caseKeys.documentCategories(params),
      queryFn: () => listDocumentCategories(params)
    };
  },

  documents({
    caseId,
    categoryId,
    cursor,
    enabled = true,
    limit
  }: {
    caseId: string;
    categoryId?: string;
    cursor?: string;
    enabled?: boolean;
    limit: number;
  }): CasesQuerySpec<CaseDocumentsListResponse> {
    const params = { categoryId, cursor, limit };

    return {
      enabled,
      permission: "documents:read",
      queryKey: caseKeys.documents(caseId, params),
      queryFn: () => listCaseDocuments({ caseId, ...params })
    };
  },

  expenseAttachments({
    caseId,
    cursor,
    enabled = true,
    expenseId,
    limit
  }: {
    caseId: string;
    cursor?: string;
    enabled?: boolean;
    expenseId: string;
    limit: number;
  }): CasesQuerySpec<CaseExpenseAttachmentsListResponse> {
    const params = { cursor, limit };

    return {
      enabled,
      permission: "expenses:read",
      queryKey: caseKeys.expenseAttachments(caseId, expenseId, params),
      queryFn: () => listCaseExpenseAttachments({ caseId, expenseId, ...params })
    };
  }
};
