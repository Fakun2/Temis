export type CaseStatus = "open" | "paused" | "closed";
export type CaseInstance = "first" | "second" | "third";
export type CaseCatalogStrategy = "manual" | "center_forum";
export type CaseTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type CaseExpenseStatus = "pending" | "paid" | "cancelled" | "overdue";
export type CaseHearingType =
  | "preliminary"
  | "trial_view"
  | "conciliation"
  | "mediation"
  | "testimonial"
  | "confessional"
  | "debate"
  | "investigative_statement"
  | "other";
export type NotificationRecipientMode = "self" | "tenant" | "practice_area" | "members";

export type NotificationSettingsDto = {
  notificationEnabled: boolean;
  notificationDate: string | null;
  notificationTime: string | null;
  notificationRecipientMode: NotificationRecipientMode;
  notificationPracticeAreaId: string | null;
  notificationMembershipIds: string[];
};

export type ProvinceDto = {
  caseCatalogStrategy: CaseCatalogStrategy;
  id: string;
  code: string;
  name: string;
};

export type ForumDto = {
  id: string;
  judicialCenterForumId: string | null;
  name: string;
};

export type JudicialCenterDto = {
  id: string;
  code: string;
  name: string;
};

export type CatalogResponse<TItem> = {
  items: TItem[];
};

export type CaseDto = {
  id: string;
  caseNumber: string;
  caption: string;
  subject: string | null;
  description: string | null;
  province: ProvinceDto | null;
  forum: ForumDto | null;
  judicialCenter: JudicialCenterDto | null;
  judicialCenterForumId: string | null;
  judicialCenterText: string | null;
  provinceText: string | null;
  jurisdictionText: string | null;
  unitText: string | null;
  court: string | null;
  instance: CaseInstance;
  status: CaseStatus;
  filingDate: string | null;
  primaryClientId: string | null;
  practiceAreaId: string | null;
  responsibleMembershipId: string | null;
  participants: Array<{
    id?: string;
    participantKind: "client" | "opposing_party" | "third_party" | "other";
    role:
      | "claimant"
      | "defendant"
      | "complainant"
      | "accused"
      | "third_party"
      | "client"
      | "opposing_party"
      | "other";
    displayName: string;
    document?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    clientId?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CaseTaskDto = NotificationSettingsDto & {
  id: string;
  caseId: string | null;
  assignedMembershipId: string | null;
  assignedTo: TaskAssigneeOption | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: CaseTaskStatus;
  notes: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GlobalCaseTaskDto = CaseTaskDto & {
  case: {
    id: string;
    caseNumber: string;
    caption: string;
  } | null;
  client: {
    id: string;
    displayName: string;
  } | null;
};

export type TaskAssigneeOption = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  practiceAreas: PracticeAreaOption[];
  roleName: string | null;
};

export type PracticeAreaOption = {
  id: string;
  name: string;
};

export type NotificationOptions = {
  practiceAreas: PracticeAreaOption[];
};

export type ParticipantOption = {
  id: string;
  fullName: string;
  email: string;
  role: { code: string; name: string } | null;
  practiceAreas: PracticeAreaOption[];
};

export type ParticipantOptionsQueryParams = {
  cursor?: string;
  limit: number;
  practiceAreaId?: string;
  role?: string;
  search?: string;
};

export type ParticipantOptionsResponse = {
  items: ParticipantOption[];
  filterOptions: {
    practiceAreas: PracticeAreaOption[];
    roles: Array<{ code: string; name: string }>;
  };
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
  };
};

export type CaseExpenseDto = NotificationSettingsDto & {
  id: string;
  caseId: string;
  taskId: string | null;
  task: { id: string; name: string } | null;
  alertAt: string | null;
  alertEnabled: boolean;
  attachments: CaseExpenseAttachmentDto[];
  concept: string;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  paymentDate: string;
  status: CaseExpenseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseExpenseAttachmentDto = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type DocumentCategoryDto = {
  id: string;
  name: string;
  description: string | null;
};

export type CaseDocumentDto = {
  id: string;
  caseId: string;
  category: DocumentCategoryDto | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  createdAt: string;
};

export type CaseHearingDto = NotificationSettingsDto & {
  id: string;
  caseId: string;
  type: CaseHearingType;
  date: string;
  time: string;
  description: string;
  notificationsEnabled: boolean;
  participantMembershipIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CaseMetricsDto = {
  hearingsCount: number;
  totalExpenses: number;
  pendingPayments: number;
  totalTasks: number;
  pendingTasks: number;
};

export type CaseDetailDto = CaseDto & {
  metrics: CaseMetricsDto;
};

export type CasesMetricsDto = {
  totalCases: number;
  openCases: number;
  closedCases: number;
  pendingTasks: number;
};

export type TenantCaseTasksMetricsDto = {
  todo: number;
  done: number;
  dueSoon: number;
  overdue: number;
};

export type TaskBoardFiltersDto = Partial<{
  assignedMembershipId: string;
  caseId: string;
  clientId: string;
  dueStatus: TenantCaseTasksDueStatus;
  endDateFrom: string;
  endDateTo: string;
  practiceAreaId: string;
  search: string;
  status: CaseTaskStatus;
}>;

export type TaskBoardVisibleProperty =
  | "case"
  | "client"
  | "assignedTo"
  | "endDate"
  | "status"
  | "notes";

export type TaskBoardSortKey =
  | "name"
  | "status"
  | "endDate"
  | "client"
  | "case"
  | "assignedTo"
  | "createdAt";

export type TaskBoardSettingsDto = {
  chartGroupBy: "status" | "client" | "case" | "assignedTo";
  chartShowHorizontalLines: boolean;
  chartSortBy: "count" | "label";
  chartSortDirection: CaseSortDirection;
  chartType: "vertical_bar" | "horizontal_bar" | "line" | "pie";
  hideZeroValues: boolean;
  kanbanCardLayout: "compact" | "list";
  kanbanCardSize: "small" | "medium" | "large";
  kanbanColorColumns: boolean;
  openTaskIn: "side_sheet" | "center_modal";
  sortBy: TaskBoardSortKey;
  sortDirection: CaseSortDirection;
  viewMode: "table" | "kanban" | "calendar" | "bar_chart";
  visibleProperties: TaskBoardVisibleProperty[];
};

export type TaskBoardViewDto = {
  id: string;
  name: string;
  filters: TaskBoardFiltersDto;
  settings: TaskBoardSettingsDto;
  createdByMembershipId: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskBoardViewsListResponse = {
  items: TaskBoardViewDto[];
};

export type TaskBoardViewInput = {
  name: string;
  filters: TaskBoardFiltersDto;
  settings?: TaskBoardSettingsDto;
};

export type CaseTasksListResponse = {
  items: CaseTaskDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type TenantCaseTasksListResponse = {
  items: GlobalCaseTaskDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CaseExpensesListResponse = {
  items: CaseExpenseDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CaseHearingsListResponse = {
  items: CaseHearingDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CaseExpenseSummaryItemDto = {
  id: string;
  concept: string;
  amount: number;
  percentage: number;
};

export type CaseExpensesSummaryDto = {
  totalAmount: number;
  totalCount: number;
  items: CaseExpenseSummaryItemDto[];
};

export type CaseCalendarEventDto = {
  amount?: number;
  caseCaption?: string;
  caseId?: string;
  caseNumber?: string;
  currencyCode?: string;
  date: string;
  id: string;
  status?: CaseExpenseStatus | string;
  hearingType?: CaseHearingType;
  time?: string;
  title: string;
  type: "payment_due" | "hearing" | "task_due";
};

export type TenantCalendarMetricsDto = {
  hearingsCount?: number;
  pendingExpensesCount?: number;
  pendingTasks?: number;
  totalTasks?: number;
};

export type CaseCalendarResponseDto = {
  events: CaseCalendarEventDto[];
  metrics?: TenantCalendarMetricsDto;
  month: string;
  pageInfo?: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CaseExpenseAttachmentsListResponse = {
  items: CaseExpenseAttachmentDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CaseDocumentsListResponse = {
  items: CaseDocumentDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type DocumentCategoriesListResponse = {
  items: DocumentCategoryDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CasesListResponse = {
  items: CaseDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CasePickerOptionDto = {
  id: string;
  caseNumber: string;
  caption: string;
  subject: string | null;
};

export type CasePickerOptionsResponse = {
  items: CasePickerOptionDto[];
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    offset: number;
    total: number;
  };
};

export type CasesQueryParams = {
  court?: string;
  cursor?: string;
  filingDate?: string;
  forumTemplateId?: string;
  instance?: CaseInstance;
  judicialCenter?: string;
  limit: number;
  offset: number;
  provinceId?: string;
  search?: string;
  status?: string;
  sortBy: CaseSortKey;
  sortDirection: CaseSortDirection;
};

export type CasePickerOptionsQueryParams = {
  cursor?: string;
  limit: number;
  offset: number;
  search?: string;
};

export type TenantCaseTasksDueStatus = "due_soon" | "overdue";

export type TenantCaseTasksQueryParams = {
  assignedMembershipId?: string;
  caseId?: string;
  clientId?: string;
  cursor?: string;
  dueStatus?: TenantCaseTasksDueStatus;
  endDateFrom?: string;
  endDateTo?: string;
  limit: number;
  offset?: number;
  practiceAreaId?: string;
  search?: string;
  sortBy?: TaskBoardSortKey;
  sortDirection?: CaseSortDirection;
  status?: CaseTaskStatus;
};

export type CasesTableColumn =
  keyof typeof import("../_constants/cases.constants").casesTableColumnLabels;
export type CaseTasksTableColumn =
  keyof typeof import("../_constants/cases.constants").caseTasksTableColumnLabels;
export type CaseSortDirection = "asc" | "desc";
export type CaseSortKey = "caseNumber" | "caption" | "createdAt" | "status";

export type CasesPageSearchParams = {
  columns?: string;
  cursor?: string;
  cursorStack?: string;
  court?: string;
  filingDate?: string;
  forumTemplateId?: string;
  instance?: string;
  judicialCenter?: string;
  provinceId?: string;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  status?: string;
};
