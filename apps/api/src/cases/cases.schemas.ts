import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { optionalBooleanInputSchema } from "../common/boolean.schemas";
import { notificationSettingsSchema } from "../notifications/notifications.schemas";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);
const optionalDniSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d{7,8}$/)
    .optional()
);
const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d{0,15}$/)
    .optional()
);
const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional()
);
const optionalNullableUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().nullable().optional()
);
const requiredDateString = z.string().trim().min(1);
const monthStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional();

const caseInstanceSchema = z.enum(["first", "second", "third"]);
const caseStatusSchema = z.enum(["open", "paused", "closed"]);
const caseTaskStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
const caseExpenseEditableStatusSchema = z.enum(["pending", "paid", "cancelled"]);
const caseExpenseStatusSchema = z.enum(["pending", "paid", "cancelled", "overdue"]);
const caseHearingTypeSchema = z.enum([
  "preliminary",
  "trial_view",
  "conciliation",
  "mediation",
  "testimonial",
  "confessional",
  "debate",
  "investigative_statement",
  "other"
]);
type CaseHearingType = z.infer<typeof caseHearingTypeSchema>;
const participantRoleSchema = z.enum([
  "claimant",
  "defendant",
  "complainant",
  "accused",
  "third_party",
  "client",
  "opposing_party",
  "other"
]);
const participantKindSchema = z.enum(["client", "opposing_party", "third_party", "other"]);

const caseParticipantInputSchema = z.object({
  participantKind: participantKindSchema.default("other"),
  role: participantRoleSchema.default("other"),
  displayName: z.string().trim().min(2).max(160),
  document: optionalDniSchema,
  address: optionalTrimmedString,
  email: optionalTrimmedString.pipe(z.string().email().optional()),
  phone: optionalPhoneSchema,
  notes: optionalTrimmedString,
  clientId: optionalUuid
});

const caseInputSchema = z.object({
  caseNumber: z.string().trim().min(1).max(80),
  caption: z.string().trim().min(3).max(240),
  subject: optionalTrimmedString,
  description: optionalTrimmedString,
  provinceId: optionalUuid,
  forumTemplateId: optionalUuid,
  judicialCenterForumId: optionalUuid,
  judicialCenterText: optionalTrimmedString,
  provinceText: optionalTrimmedString,
  jurisdictionText: optionalTrimmedString,
  unitText: optionalTrimmedString,
  court: optionalTrimmedString,
  instance: caseInstanceSchema.default("first"),
  status: caseStatusSchema.default("open"),
  filingDate: optionalTrimmedString,
  primaryClientId: optionalUuid,
  practiceAreaId: optionalUuid,
  responsibleMembershipId: optionalUuid,
  participants: z.array(caseParticipantInputSchema).max(20).default([])
}).superRefine((input, ctx) => {
  const hasCatalog = Boolean(input.provinceId && input.forumTemplateId);
  const hasLooseJurisdiction = Boolean(
    input.provinceText || input.jurisdictionText || input.unitText || input.court
  );

  if (!hasCatalog && !hasLooseJurisdiction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Indica provincia/fuero catalogados o datos judiciales en texto.",
      path: ["jurisdictionText"]
    });
  }

  if ((input.provinceId && !input.forumTemplateId) || (!input.provinceId && input.forumTemplateId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provincia y fuero catalogados deben enviarse juntos.",
      path: ["forumTemplateId"]
    });
  }
});

export const createCaseSchema = caseInputSchema;
export const updateCaseSchema = caseInputSchema;

const caseTaskInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    assignedMembershipId: optionalNullableUuid,
    startDate: optionalTrimmedString,
    endDate: optionalTrimmedString,
    status: caseTaskStatusSchema.default("pending"),
    notes: optionalTrimmedString
  })
  .and(notificationSettingsSchema);

const caseExpenseInputSchema = z
  .object({
    concept: z.string().trim().min(3).max(160),
    amount: z.coerce.number().min(0.01).max(9999999999.99),
    currencyCode: currencyCodeSchema,
    expenseDate: requiredDateString,
    paymentDate: requiredDateString,
    status: caseExpenseEditableStatusSchema,
    notes: optionalTrimmedString.pipe(z.string().max(100).optional()),
    taskId: optionalUuid
  })
  .and(notificationSettingsSchema);

const caseHearingInputSchema = z
  .object({
    type: caseHearingTypeSchema,
    date: requiredDateString,
    time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    description: z.string().trim().min(3).max(500),
    notificationsEnabled: optionalBooleanInputSchema
  })
  .and(notificationSettingsSchema);

export const listCasesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
  cursor: optionalTrimmedString,
  offset: z.coerce.number().int().min(0).default(0),
  search: optionalTrimmedString,
  filingDate: optionalTrimmedString,
  status: caseStatusSchema.optional(),
  instance: caseInstanceSchema.optional(),
  provinceId: optionalUuid,
  forumTemplateId: optionalUuid,
  judicialCenter: optionalTrimmedString,
  court: optionalTrimmedString,
  sortBy: z
    .enum(["caseNumber", "caption", "filingDate", "createdAt", "status"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
});

export const listCasePickerOptionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
  cursor: optionalTrimmedString,
  offset: z.coerce.number().int().min(0).default(0),
  search: optionalTrimmedString
});

export const listCaseExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(8),
  cursor: optionalTrimmedString,
  currencyCode: currencyCodeSchema.optional(),
  status: caseExpenseStatusSchema.optional(),
  taskId: optionalUuid
});

export const listCaseHearingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(8),
  cursor: optionalTrimmedString
});

export const listCaseTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(8),
  cursor: optionalTrimmedString
});

export const listCaseExpenseAttachmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(8),
  cursor: optionalTrimmedString
});

export const listCaseDocumentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(8),
  cursor: optionalTrimmedString,
  categoryId: optionalUuid
});

export const listDocumentCategoriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
  cursor: optionalTrimmedString,
  active: optionalBooleanInputSchema
});

export const createCaseDocumentBodySchema = z.object({
  categoryId: optionalUuid,
  notes: optionalTrimmedString.pipe(z.string().max(500).optional())
});

export const caseCalendarQuerySchema = z.object({
  caseId: optionalUuid,
  month: monthStringSchema,
  mode: z.enum(["month", "list"]).default("month"),
  limit: z.coerce.number().int().min(1).max(8).default(5),
  cursor: optionalTrimmedString,
  types: optionalTrimmedString
});

export class ListCasesQueryDto extends createZodDto(listCasesQuerySchema) {}
export class ListCasePickerOptionsQueryDto extends createZodDto(listCasePickerOptionsQuerySchema) {}
export class ListCaseExpensesQueryDto extends createZodDto(listCaseExpensesQuerySchema) {}
export class ListCaseHearingsQueryDto extends createZodDto(listCaseHearingsQuerySchema) {}
export class ListCaseTasksQueryDto extends createZodDto(listCaseTasksQuerySchema) {}
export class ListCaseExpenseAttachmentsQueryDto extends createZodDto(
  listCaseExpenseAttachmentsQuerySchema
) {}
export class ListCaseDocumentsQueryDto extends createZodDto(listCaseDocumentsQuerySchema) {}
export class ListDocumentCategoriesQueryDto extends createZodDto(
  listDocumentCategoriesQuerySchema
) {}
export class CaseCalendarQueryDto extends createZodDto(caseCalendarQuerySchema) {}
export class CreateCaseDto extends createZodDto(createCaseSchema) {}
export class UpdateCaseDto extends createZodDto(updateCaseSchema) {}
export class CreateCaseTaskDto extends createZodDto(caseTaskInputSchema) {}
export class UpdateCaseTaskDto extends createZodDto(caseTaskInputSchema) {}
export class CreateCaseExpenseDto extends createZodDto(caseExpenseInputSchema) {}
export class UpdateCaseExpenseDto extends createZodDto(caseExpenseInputSchema) {}
export class CreateCaseHearingDto extends createZodDto(caseHearingInputSchema) {}
export class UpdateCaseHearingDto extends createZodDto(caseHearingInputSchema) {}
export class CreateCaseDocumentBodyDto extends createZodDto(createCaseDocumentBodySchema) {
  @ApiProperty({ type: "string", format: "binary" })
  file!: unknown;
}

export class CaseProvinceDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "ar-tucuman" })
  code!: string;

  @ApiProperty({ example: "Tucuman" })
  name!: string;
}

export class CaseForumDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "ar-tucuman-civil-comercial-comun" })
  code!: string;

  @ApiProperty({ example: "Civil y comercial comun" })
  name!: string;
}

export class CaseJudicialCenterDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "ar-tucuman-centro-judicial-capital" })
  code!: string;

  @ApiProperty({ example: "Centro Judicial Capital" })
  name!: string;
}

export class CaseParticipantDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: participantKindSchema.options })
  participantKind!: z.infer<typeof participantKindSchema>;

  @ApiProperty({ enum: participantRoleSchema.options })
  role!: z.infer<typeof participantRoleSchema>;

  @ApiProperty({ example: "Juan Perez" })
  displayName!: string;

  @ApiProperty({ nullable: true, type: String })
  document!: string | null;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  email!: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  clientId!: string | null;
}

export class CaseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "EXP-1234/2026" })
  caseNumber!: string;

  @ApiProperty({ example: "Perez c/ Gomez s/ Danos y perjuicios" })
  caption!: string;

  @ApiProperty({ nullable: true, type: String })
  subject!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ nullable: true, type: CaseProvinceDto })
  province!: CaseProvinceDto | null;

  @ApiProperty({ nullable: true, type: CaseForumDto })
  forum!: CaseForumDto | null;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  judicialCenterForumId!: string | null;

  @ApiProperty({ nullable: true, type: CaseJudicialCenterDto })
  judicialCenter!: CaseJudicialCenterDto | null;

  @ApiProperty({ nullable: true, type: String })
  judicialCenterText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  provinceText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  jurisdictionText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  unitText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  court!: string | null;

  @ApiProperty({ enum: caseInstanceSchema.options })
  instance!: z.infer<typeof caseInstanceSchema>;

  @ApiProperty({ enum: caseStatusSchema.options })
  status!: z.infer<typeof caseStatusSchema>;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  filingDate!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  primaryClientId!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  practiceAreaId!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  responsibleMembershipId!: string | null;

  @ApiProperty({ type: [CaseParticipantDto] })
  participants!: CaseParticipantDto[];

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class CasePickerOptionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "EXP-1234/2026" })
  caseNumber!: string;

  @ApiProperty({ example: "Perez c/ Gomez s/ Danos y perjuicios" })
  caption!: string;

  @ApiProperty({ nullable: true, type: String })
  subject!: string | null;
}

export class CaseTaskAssigneeDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ nullable: true, type: String, example: "Abogado" })
  roleName!: string | null;
}

export class CaseTaskDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  caseId!: string;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  assignedMembershipId!: string | null;

  @ApiProperty({ nullable: true, type: CaseTaskAssigneeDto })
  assignedTo!: CaseTaskAssigneeDto | null;

  @ApiProperty({ example: "Presentar escrito inicial" })
  name!: string;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  startDate!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  endDate!: string | null;

  @ApiProperty({ enum: caseTaskStatusSchema.options })
  status!: z.infer<typeof caseTaskStatusSchema>;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ example: false })
  notificationEnabled!: boolean;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  notificationDate!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "09:30" })
  notificationTime!: string | null;

  @ApiProperty({ enum: ["self", "tenant", "practice_area", "members"], example: "self" })
  notificationRecipientMode!: "self" | "tenant" | "practice_area" | "members";

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  notificationPracticeAreaId!: string | null;

  @ApiProperty({ type: [String], format: "uuid" })
  notificationMembershipIds!: string[];

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  lastSeenAt!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class CaseExpenseTaskDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Presentar escrito inicial" })
  name!: string;
}

export class CaseExpenseAttachmentDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "comprobante.pdf" })
  originalName!: string;

  @ApiProperty({ example: "application/pdf" })
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  sizeBytes!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class DocumentCategoryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Escritos" })
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;
}

export class CaseDocumentDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  caseId!: string;

  @ApiProperty({ nullable: true, type: DocumentCategoryDto })
  category!: DocumentCategoryDto | null;

  @ApiProperty({ example: "demanda.pdf" })
  originalName!: string;

  @ApiProperty({ example: "application/pdf" })
  mimeType!: string;

  @ApiProperty({ example: 245760 })
  sizeBytes!: number;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class CaseExpenseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  caseId!: string;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  taskId!: string | null;

  @ApiProperty({ nullable: true, type: CaseExpenseTaskDto })
  task!: CaseExpenseTaskDto | null;

  @ApiProperty({ example: "Tasa judicial" })
  concept!: string;

  @ApiProperty({ example: 15000 })
  amount!: number;

  @ApiProperty({ example: "ARS" })
  currencyCode!: string;

  @ApiProperty({ type: String, format: "date" })
  expenseDate!: string;

  @ApiProperty({ type: String, format: "date" })
  paymentDate!: string;

  @ApiProperty({ enum: caseExpenseStatusSchema.options })
  status!: z.infer<typeof caseExpenseStatusSchema>;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ example: false })
  alertEnabled!: boolean;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  alertAt!: string | null;

  @ApiProperty({ example: false })
  notificationEnabled!: boolean;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  notificationDate!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "09:30" })
  notificationTime!: string | null;

  @ApiProperty({ enum: ["self", "tenant", "practice_area", "members"], example: "self" })
  notificationRecipientMode!: "self" | "tenant" | "practice_area" | "members";

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  notificationPracticeAreaId!: string | null;

  @ApiProperty({ type: [String], format: "uuid" })
  notificationMembershipIds!: string[];

  @ApiProperty({ type: [CaseExpenseAttachmentDto] })
  attachments!: CaseExpenseAttachmentDto[];

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class CaseHearingDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  caseId!: string;

  @ApiProperty({ enum: caseHearingTypeSchema.options })
  type!: CaseHearingType;

  @ApiProperty({ type: String, format: "date" })
  date!: string;

  @ApiProperty({ example: "09:30" })
  time!: string;

  @ApiProperty({ example: "Audiencia preliminar en juzgado civil." })
  description!: string;

  @ApiProperty({ example: true })
  notificationsEnabled!: boolean;

  @ApiProperty({ example: false })
  notificationEnabled!: boolean;

  @ApiProperty({ nullable: true, type: String, format: "date" })
  notificationDate!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "09:30" })
  notificationTime!: string | null;

  @ApiProperty({ enum: ["self", "tenant", "practice_area", "members"], example: "self" })
  notificationRecipientMode!: "self" | "tenant" | "practice_area" | "members";

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  notificationPracticeAreaId!: string | null;

  @ApiProperty({ type: [String], format: "uuid" })
  notificationMembershipIds!: string[];

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class CaseMetricsDto {
  @ApiProperty({ example: 3 })
  hearingsCount!: number;

  @ApiProperty({ example: 15000 })
  totalExpenses!: number;

  @ApiProperty({ example: 8500 })
  pendingPayments!: number;

  @ApiProperty({ example: 12 })
  totalTasks!: number;

  @ApiProperty({ example: 5 })
  pendingTasks!: number;
}

export class CaseDetailDto extends CaseDto {
  @ApiProperty({ type: CaseMetricsDto })
  metrics!: CaseMetricsDto;
}

export class CasesMetricsDto {
  @ApiProperty({ example: 42 })
  totalCases!: number;

  @ApiProperty({ example: 31 })
  openCases!: number;

  @ApiProperty({ example: 8 })
  closedCases!: number;

  @ApiProperty({ example: 5 })
  pendingTasks!: number;
}

export class TenantCalendarMetricsDto {
  @ApiPropertyOptional({ example: 12 })
  totalTasks?: number;

  @ApiPropertyOptional({ example: 5 })
  pendingTasks?: number;

  @ApiPropertyOptional({ example: 3 })
  hearingsCount?: number;

  @ApiPropertyOptional({ example: 4 })
  pendingExpensesCount?: number;
}

export class CasesPageInfoDto {
  @ApiProperty({ example: 8 })
  limit!: number;

  @ApiProperty({ deprecated: true, example: 0 })
  offset!: number;

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ deprecated: true, example: 42 })
  total!: number;
}

export class CaseTasksListResponseDto {
  @ApiProperty({ type: [CaseTaskDto] })
  items!: CaseTaskDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CaseExpensesListResponseDto {
  @ApiProperty({ type: [CaseExpenseDto] })
  items!: CaseExpenseDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CaseHearingsListResponseDto {
  @ApiProperty({ type: [CaseHearingDto] })
  items!: CaseHearingDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CaseExpenseSummaryItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Tasa de justicia" })
  concept!: string;

  @ApiProperty({ example: 120000 })
  amount!: number;

  @ApiProperty({ example: 48.5 })
  percentage!: number;
}

export class CaseExpensesSummaryDto {
  @ApiProperty({ example: 250000 })
  totalAmount!: number;

  @ApiProperty({ example: 12 })
  totalCount!: number;

  @ApiProperty({ type: [CaseExpenseSummaryItemDto] })
  items!: CaseExpenseSummaryItemDto[];
}

export class CaseExpensesOverdueRecalculationDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";

  @ApiProperty({ example: 3 })
  updatedCount!: number;
}

export class CaseCalendarEventDto {
  @ApiProperty({ enum: ["payment_due", "hearing", "task_due"], example: "payment_due" })
  type!: "payment_due" | "hearing" | "task_due";

  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Pago: Tasa de justicia" })
  title!: string;

  @ApiProperty({ example: "2026-08-12" })
  date!: string;

  @ApiPropertyOptional({ example: 120000 })
  amount?: number;

  @ApiPropertyOptional({ example: "ARS" })
  currencyCode?: string;

  @ApiPropertyOptional({ example: "pending" })
  status?: string;

  @ApiPropertyOptional({ enum: caseHearingTypeSchema.options, example: "preliminary" })
  hearingType?: CaseHearingType;

  @ApiPropertyOptional({ type: String, example: "09:30" })
  time?: string;

  @ApiPropertyOptional({ format: "uuid" })
  caseId?: string;

  @ApiPropertyOptional({ example: "EXP-123/2026" })
  caseNumber?: string;

  @ApiPropertyOptional({ example: "Perez c/ Gomez s/ Danos y perjuicios" })
  caseCaption?: string;
}

export class CaseCalendarResponseDto {
  @ApiProperty({ example: "2026-08" })
  month!: string;

  @ApiProperty({ type: [CaseCalendarEventDto] })
  events!: CaseCalendarEventDto[];

  @ApiPropertyOptional({ type: CasesPageInfoDto })
  pageInfo?: CasesPageInfoDto;

  @ApiPropertyOptional({ type: TenantCalendarMetricsDto })
  metrics?: TenantCalendarMetricsDto;
}

export class CaseExpenseAttachmentsListResponseDto {
  @ApiProperty({ type: [CaseExpenseAttachmentDto] })
  items!: CaseExpenseAttachmentDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CaseDocumentsListResponseDto {
  @ApiProperty({ type: [CaseDocumentDto] })
  items!: CaseDocumentDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class DocumentCategoriesListResponseDto {
  @ApiProperty({ type: [DocumentCategoryDto] })
  items!: DocumentCategoryDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CasesListResponseDto {
  @ApiProperty({ type: [CaseDto] })
  items!: CaseDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CasePickerOptionsResponseDto {
  @ApiProperty({ type: [CasePickerOptionDto] })
  items!: CasePickerOptionDto[];

  @ApiProperty({ type: CasesPageInfoDto })
  pageInfo!: CasesPageInfoDto;
}

export class CaseDeleteResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
export type ListCasePickerOptionsQuery = z.infer<typeof listCasePickerOptionsQuerySchema>;
export type ListCaseExpensesQuery = z.infer<typeof listCaseExpensesQuerySchema>;
export type ListCaseHearingsQuery = z.infer<typeof listCaseHearingsQuerySchema>;
export type ListCaseTasksQuery = z.infer<typeof listCaseTasksQuerySchema>;
export type ListCaseExpenseAttachmentsQuery = z.infer<typeof listCaseExpenseAttachmentsQuerySchema>;
export type ListCaseDocumentsQuery = z.infer<typeof listCaseDocumentsQuerySchema>;
export type ListDocumentCategoriesQuery = z.infer<typeof listDocumentCategoriesQuerySchema>;
export type CreateCaseDocumentInput = z.infer<typeof createCaseDocumentBodySchema>;
export type CaseCalendarQuery = z.infer<typeof caseCalendarQuerySchema>;
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CreateCaseTaskInput = z.infer<typeof caseTaskInputSchema>;
export type UpdateCaseTaskInput = z.infer<typeof caseTaskInputSchema>;
export type CreateCaseExpenseInput = z.infer<typeof caseExpenseInputSchema>;
export type UpdateCaseExpenseInput = z.infer<typeof caseExpenseInputSchema>;
export type CreateCaseHearingInput = z.infer<typeof caseHearingInputSchema>;
export type UpdateCaseHearingInput = z.infer<typeof caseHearingInputSchema>;
