import { dashboardHttpClient } from "@/lib/http";
import type {
  CaseExpenseFormValues,
  CaseHearingFormValues,
  CaseFormValues,
  CaseTaskFormValues
} from "@/lib/validation/cases";
import type {
  CaseDto,
  CaseCalendarResponseDto,
  CaseDetailDto,
  CaseExpenseStatus,
  CaseExpenseAttachmentDto,
  CaseExpenseAttachmentsListResponse,
  CaseExpenseDto,
  CaseExpensesListResponse,
  CaseExpensesSummaryDto,
  CaseHearingDto,
  CaseHearingsListResponse,
  CasePickerOptionsQueryParams,
  CasePickerOptionsResponse,
  CaseTaskDto,
  CaseTasksListResponse,
  CasesMetricsDto,
  CasesListResponse,
  CasesQueryParams,
  CatalogResponse,
  NotificationOptions,
  TaskAssigneeOption
} from "../_types/cases.types";

export const caseKeys = {
  all: ["cases"] as const,
  detail: (caseId: string) => [...caseKeys.all, "detail", caseId] as const,
  metrics: () => [...caseKeys.all, "metrics"] as const,
  notificationOptions: () => [...caseKeys.all, "notification-options"] as const,
  taskAssignees: () => [...caseKeys.all, "task-assignees"] as const,
  list: (params: CasesQueryParams) => [...caseKeys.all, "list", params] as const,
  pickerOptions: (params: CasePickerOptionsQueryParams) =>
    [...caseKeys.all, "picker-options", params] as const,
  options: (key: string, params: Record<string, string | number | undefined>) =>
    ["case-options", key, params] as const,
  expenses: (
    caseId: string,
    params?: {
      currencyCode?: string;
      cursor?: string;
      limit?: number;
      status?: CaseExpenseStatus;
      taskId?: string;
    }
  ) => [...caseKeys.detail(caseId), "expenses", params ?? {}] as const,
  expense: (caseId: string, expenseId: string) =>
    [...caseKeys.detail(caseId), "expenses", expenseId] as const,
  hearings: (caseId: string, params?: { cursor?: string; limit?: number }) =>
    [...caseKeys.detail(caseId), "hearings", params ?? {}] as const,
  expensesSummary: (caseId: string) => [...caseKeys.detail(caseId), "expenses", "summary"] as const,
  calendar: (
    caseId: string,
    params: {
      cursor?: string;
      limit?: number;
      mode?: "month" | "list";
      month: string;
      types?: string;
    }
  ) => [...caseKeys.detail(caseId), "calendar", params] as const,
  tenantCalendar: (params: {
    caseId?: string;
    cursor?: string;
    limit?: number;
    mode?: "month" | "list";
    month: string;
    types?: string;
  }) => [...caseKeys.all, "calendar", params] as const,
  documents: (caseId: string, params?: { categoryId?: string; cursor?: string; limit?: number }) =>
    [...caseKeys.detail(caseId), "documents", params ?? {}] as const,
  documentCategories: (params?: { active?: boolean; cursor?: string; limit?: number }) =>
    ["document-categories", params ?? {}] as const,
  expenseAttachments: (
    caseId: string,
    expenseId: string,
    params?: { cursor?: string; limit?: number }
  ) => [...caseKeys.detail(caseId), "expenses", expenseId, "attachments", params ?? {}] as const,
  tasks: (caseId: string, params?: { cursor?: string; limit?: number }) =>
    [...caseKeys.detail(caseId), "tasks", params ?? {}] as const
};

export async function listCases(params: CasesQueryParams): Promise<CasesListResponse> {
  return dashboardHttpClient.request<CasesListResponse>({
    params,
    path: "/cases"
  });
}

export async function listCasePickerOptions(
  params: CasePickerOptionsQueryParams
): Promise<CasePickerOptionsResponse> {
  return dashboardHttpClient.request<CasePickerOptionsResponse>({
    params,
    path: "/cases/picker-options"
  });
}

export async function getCaseMetrics(): Promise<CasesMetricsDto> {
  return dashboardHttpClient.request<CasesMetricsDto>({
    path: "/cases/metrics"
  });
}

export async function getCaseDetail(caseId: string): Promise<CaseDetailDto> {
  return dashboardHttpClient.request<CaseDetailDto>({
    path: `/cases/${caseId}`
  });
}

export async function listCatalogOptions<TItem>({
  params,
  path
}: {
  params?: Record<string, string | number | undefined>;
  path: string;
}): Promise<CatalogResponse<TItem>> {
  return dashboardHttpClient.request<CatalogResponse<TItem>>({
    params: { limit: 50, offset: 0, sort: "name:asc", ...params },
    path
  });
}

export async function saveCase({
  caseId,
  input
}: {
  caseId?: string;
  input: CaseFormValues;
}): Promise<CaseDto> {
  return dashboardHttpClient.request<CaseDto>({
    body: {
      ...input,
      filingDate: input.filingDate || undefined
    },
    method: caseId ? "PATCH" : "POST",
    path: caseId ? `/cases/${caseId}` : "/cases"
  });
}

export async function deleteCase(caseId: string): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/cases/${caseId}`
  });
}

export async function listCaseTasks({
  caseId,
  cursor,
  limit = 8
}: {
  caseId: string;
  cursor?: string;
  limit?: number;
}): Promise<CaseTasksListResponse> {
  return dashboardHttpClient.request<CaseTasksListResponse>({
    params: { cursor, limit },
    path: `/cases/${caseId}/tasks`
  });
}

export async function saveCaseTask({
  caseId,
  input,
  taskId
}: {
  caseId: string;
  input: CaseTaskFormValues;
  taskId?: string;
}): Promise<CaseTaskDto> {
  return dashboardHttpClient.request<CaseTaskDto>({
    body: {
      ...input,
      assignedMembershipId: input.assignedMembershipId || null,
      endDate: input.endDate || undefined,
      startDate: input.startDate || undefined
    },
    method: taskId ? "PATCH" : "POST",
    path: taskId ? `/cases/${caseId}/tasks/${taskId}` : `/cases/${caseId}/tasks`
  });
}

export async function markCaseTaskSeen({
  caseId,
  taskId
}: {
  caseId: string;
  taskId: string;
}): Promise<CaseTaskDto> {
  return dashboardHttpClient.request<CaseTaskDto>({
    method: "PATCH",
    path: `/cases/${caseId}/tasks/${taskId}/seen`
  });
}

export async function listTaskAssignees(): Promise<TaskAssigneeOption[]> {
  const response = await getStaffOptionsResponse();

  return response.workers.filter((worker) => worker.status === "active").map(toTaskAssigneeOption);
}

export async function listNotificationOptions(): Promise<NotificationOptions> {
  const response = await getStaffOptionsResponse();

  return {
    members: response.workers
      .filter((worker) => worker.status === "active")
      .map(toTaskAssigneeOption),
    practiceAreas: response.filterOptions.practiceAreas.map((practiceArea) => ({
      id: practiceArea.id,
      name: practiceArea.name
    }))
  };
}

async function getStaffOptionsResponse() {
  const response = await dashboardHttpClient.request<{
    filterOptions: {
      practiceAreas: Array<{
        id: string;
        name: string;
      }>;
    };
    workers: Array<{
      id: string;
      userId: string;
      fullName: string;
      email: string;
      role: { name: string } | null;
      status: string;
    }>;
  }>({
    params: {
      limit: 50,
      sortBy: "lastName",
      sortDirection: "asc",
      status: "active"
    },
    path: "/staff"
  });

  return response;
}

function toTaskAssigneeOption(worker: {
  email: string;
  fullName: string;
  id: string;
  role: { name: string } | null;
  userId: string;
}): TaskAssigneeOption {
  return {
    id: worker.id,
    userId: worker.userId,
    fullName: worker.fullName,
    email: worker.email,
    roleName: worker.role?.name ?? null
  };
}

export async function deleteCaseTask({
  caseId,
  taskId
}: {
  caseId: string;
  taskId: string;
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/cases/${caseId}/tasks/${taskId}`
  });
}

export async function listCaseExpenses({
  caseId,
  currencyCode,
  cursor,
  limit = 8,
  status,
  taskId
}: {
  caseId: string;
  currencyCode?: string;
  cursor?: string;
  limit?: number;
  status?: CaseExpenseStatus;
  taskId?: string;
}): Promise<CaseExpensesListResponse> {
  return dashboardHttpClient.request<CaseExpensesListResponse>({
    params: { currencyCode, cursor, limit, status, taskId },
    path: `/cases/${caseId}/expenses`
  });
}

export async function getCaseExpense({
  caseId,
  expenseId
}: {
  caseId: string;
  expenseId: string;
}): Promise<CaseExpenseDto> {
  return dashboardHttpClient.request<CaseExpenseDto>({
    path: `/cases/${caseId}/expenses/${expenseId}`
  });
}

export async function getCaseExpensesSummary(caseId: string): Promise<CaseExpensesSummaryDto> {
  return dashboardHttpClient.request<CaseExpensesSummaryDto>({
    path: `/cases/${caseId}/expenses/summary`
  });
}

export async function getCaseCalendar({
  caseId,
  cursor,
  limit,
  mode,
  month,
  types
}: {
  caseId: string;
  cursor?: string;
  limit?: number;
  mode?: "month" | "list";
  month: string;
  types?: string;
}): Promise<CaseCalendarResponseDto> {
  return dashboardHttpClient.request<CaseCalendarResponseDto>({
    params: { cursor, limit, mode, month, types },
    path: `/cases/${caseId}/calendar`
  });
}

export async function getTenantCalendar({
  caseId,
  cursor,
  limit,
  mode,
  month,
  types
}: {
  caseId?: string;
  cursor?: string;
  limit?: number;
  mode?: "month" | "list";
  month: string;
  types?: string;
}): Promise<CaseCalendarResponseDto> {
  return dashboardHttpClient.request<CaseCalendarResponseDto>({
    params: { caseId, cursor, limit, mode, month, types },
    path: "/cases/calendar"
  });
}

export async function listCaseHearings({
  caseId,
  cursor,
  limit = 8
}: {
  caseId: string;
  cursor?: string;
  limit?: number;
}): Promise<CaseHearingsListResponse> {
  return dashboardHttpClient.request<CaseHearingsListResponse>({
    params: { cursor, limit },
    path: `/cases/${caseId}/hearings`
  });
}

export async function saveCaseHearing({
  caseId,
  hearingId,
  input
}: {
  caseId: string;
  hearingId?: string;
  input: CaseHearingFormValues;
}): Promise<CaseHearingDto> {
  return dashboardHttpClient.request<CaseHearingDto>({
    body: input,
    method: hearingId ? "PATCH" : "POST",
    path: hearingId ? `/cases/${caseId}/hearings/${hearingId}` : `/cases/${caseId}/hearings`
  });
}

export async function deleteCaseHearing({
  caseId,
  hearingId
}: {
  caseId: string;
  hearingId: string;
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/cases/${caseId}/hearings/${hearingId}`
  });
}

export async function saveCaseExpense({
  caseId,
  expenseId,
  input
}: {
  caseId: string;
  expenseId?: string;
  input: CaseExpenseFormValues;
}): Promise<CaseExpenseDto> {
  return dashboardHttpClient.request<CaseExpenseDto>({
    body: {
      ...input,
      taskId: input.taskId || undefined
    },
    method: expenseId ? "PATCH" : "POST",
    path: expenseId ? `/cases/${caseId}/expenses/${expenseId}` : `/cases/${caseId}/expenses`
  });
}

export async function deleteCaseExpense({
  caseId,
  expenseId
}: {
  caseId: string;
  expenseId: string;
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/cases/${caseId}/expenses/${expenseId}`
  });
}

export async function listCaseExpenseAttachments({
  caseId,
  cursor,
  expenseId,
  limit = 8
}: {
  caseId: string;
  cursor?: string;
  expenseId: string;
  limit?: number;
}): Promise<CaseExpenseAttachmentsListResponse> {
  return dashboardHttpClient.request<CaseExpenseAttachmentsListResponse>({
    params: { cursor, limit },
    path: `/cases/${caseId}/expenses/${expenseId}/attachments`
  });
}

export async function uploadCaseExpenseAttachment({
  caseId,
  expenseId,
  file
}: {
  caseId: string;
  expenseId: string;
  file: File;
}): Promise<CaseExpenseAttachmentDto> {
  const body = new FormData();
  body.set("file", file);

  const response = await fetch(`/api/cases/${caseId}/expenses/${expenseId}/attachments`, {
    body,
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await getUploadErrorMessage(response));
  }

  return response.json() as Promise<CaseExpenseAttachmentDto>;
}

export async function deleteCaseExpenseAttachment({
  attachmentId,
  caseId,
  expenseId
}: {
  attachmentId: string;
  caseId: string;
  expenseId: string;
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/cases/${caseId}/expenses/${expenseId}/attachments/${attachmentId}`
  });
}

export function getCaseExpenseAttachmentDownloadUrl({
  attachmentId,
  caseId,
  expenseId
}: {
  attachmentId: string;
  caseId: string;
  expenseId: string;
}) {
  return `/api/cases/${caseId}/expenses/${expenseId}/attachments/${attachmentId}/download`;
}

async function getUploadErrorMessage(response: Response, label = "comprobante") {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  if (typeof body?.message === "string") {
    return body.message;
  }

  if (Array.isArray(body?.message)) {
    return body.message.join(" ");
  }

  return `No se pudo subir el ${label} (${response.status}).`;
}
