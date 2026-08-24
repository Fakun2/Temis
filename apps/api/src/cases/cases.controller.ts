import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import { CaseDocumentUploadRateLimitGuard } from "./guards/case-document-upload-rate-limit.guard";
import { CaseExpenseAttachmentUploadRateLimitGuard } from "./guards/case-expense-attachment-upload-rate-limit.guard";
import {
  CaseCalendarQueryDto,
  CaseCalendarResponseDto,
  CaseDetailDto,
  CaseDeleteResponseDto,
  CaseDocumentDto,
  CaseDocumentsListResponseDto,
  CaseDto,
  CaseExpenseAttachmentDto,
  CaseExpenseAttachmentsListResponseDto,
  CaseExpenseDto,
  CaseExpensesOverdueRecalculationDto,
  CaseExpensesListResponseDto,
  CaseExpensesSummaryDto,
  CaseHearingDto,
  CaseHearingsListResponseDto,
  CasePickerOptionsResponseDto,
  CasesMetricsDto,
  CaseTaskDto,
  CaseTasksListResponseDto,
  CasesListResponseDto,
  CreateCaseDto,
  CreateCaseDocumentBodyDto,
  CreateCaseExpenseDto,
  CreateCaseHearingDto,
  CreateCaseTaskDto,
  ListCaseExpenseAttachmentsQueryDto,
  ListCaseDocumentsQueryDto,
  ListCaseExpensesQueryDto,
  ListCaseHearingsQueryDto,
  ListCasePickerOptionsQueryDto,
  ListCaseTasksQueryDto,
  ListCasesQueryDto,
  UpdateCaseDto,
  UpdateCaseExpenseDto,
  UpdateCaseHearingDto,
  UpdateCaseTaskDto
} from "./cases.schemas";
import { CasesService } from "./cases.service";
import {
  isPreviewableDocumentMimeType,
  maxCaseDocumentSizeBytes
} from "./use-cases/case-documents.use-case";
import { maxCaseExpenseAttachmentSizeBytes } from "./use-cases/case-expense-attachments.use-case";

@ApiTags("cases")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("cases")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @Permissions("cases:read")
  @ApiOkResponse({ type: CasesListResponseDto })
  list(@ActiveTenant() tenantId: string, @Query() query: ListCasesQueryDto) {
    return this.casesService.list(tenantId, query);
  }

  @Get("metrics")
  @Permissions("cases:read")
  @ApiOkResponse({ type: CasesMetricsDto })
  getMetrics(@ActiveTenant() tenantId: string) {
    return this.casesService.getMetrics(tenantId);
  }

  @Get("calendar")
  @Permissions("cases:read")
  @ApiOkResponse({ type: CaseCalendarResponseDto })
  getTenantCalendar(
    @ActiveTenant() tenantId: string,
    @Query() query: CaseCalendarQueryDto,
    @Req() request: AuthenticatedRequest
  ) {
    const tenantPermissions = getTenantPermissions(request, tenantId);

    return this.casesService.getTenantCalendar(tenantId, query, {
      canReadExpenses: tenantPermissions.has("expenses:read"),
      canReadHearings: tenantPermissions.has("hearings:read"),
      canReadTasks: tenantPermissions.has("tasks:read")
    });
  }

  @Get("picker-options")
  @Permissions("cases:read")
  @ApiOkResponse({ type: CasePickerOptionsResponseDto })
  listPickerOptions(
    @ActiveTenant() tenantId: string,
    @Query() query: ListCasePickerOptionsQueryDto
  ) {
    return this.casesService.listPickerOptions(tenantId, query);
  }

  @Post()
  @Permissions("cases:create")
  @ApiCreatedResponse({ type: CaseDto })
  create(@ActiveTenant() tenantId: string, @Body() input: CreateCaseDto) {
    return this.casesService.create(tenantId, input);
  }

  @Get(":id")
  @Permissions("cases:read")
  @ApiOkResponse({ type: CaseDetailDto })
  getDetail(@ActiveTenant() tenantId: string, @Param("id") caseId: string) {
    return this.casesService.getDetail(tenantId, caseId);
  }

  @Get(":caseId/tasks")
  @Permissions("cases:read", "tasks:read")
  @ApiOkResponse({ type: CaseTasksListResponseDto })
  listTasks(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Query() query: ListCaseTasksQueryDto
  ) {
    return this.casesService.listTasks(tenantId, caseId, query);
  }

  @Post(":caseId/tasks")
  @Permissions("cases:read", "tasks:create")
  @ApiCreatedResponse({ type: CaseTaskDto })
  createTask(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Body() input: CreateCaseTaskDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.createTask(
      tenantId,
      caseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Patch(":caseId/tasks/:taskId")
  @Permissions("cases:read", "tasks:update")
  @ApiOkResponse({ type: CaseTaskDto })
  updateTask(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("taskId") taskId: string,
    @Body() input: UpdateCaseTaskDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.updateTask(
      tenantId,
      caseId,
      taskId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Patch(":caseId/tasks/:taskId/seen")
  @Permissions("cases:read", "tasks:read")
  @ApiOkResponse({ type: CaseTaskDto })
  markTaskSeen(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("taskId") taskId: string
  ) {
    return this.casesService.markTaskSeen(tenantId, caseId, taskId);
  }

  @Delete(":caseId/tasks/:taskId")
  @Permissions("cases:read", "tasks:delete")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  deleteTask(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("taskId") taskId: string
  ) {
    return this.casesService.deleteTask(tenantId, caseId, taskId);
  }

  @Get(":caseId/calendar")
  @Permissions("cases:read")
  @ApiOkResponse({ type: CaseCalendarResponseDto })
  getCalendar(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Query() query: CaseCalendarQueryDto,
    @Req() request: AuthenticatedRequest
  ) {
    const tenantPermissions = getTenantPermissions(request, tenantId);

    return this.casesService.getCalendar(tenantId, caseId, query, {
      canReadExpenses: tenantPermissions.has("expenses:read"),
      canReadHearings: tenantPermissions.has("hearings:read"),
      canReadTasks: tenantPermissions.has("tasks:read")
    });
  }

  @Get(":caseId/documents")
  @Permissions("cases:read", "documents:read")
  @ApiOkResponse({ type: CaseDocumentsListResponseDto })
  listDocuments(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Query() query: ListCaseDocumentsQueryDto
  ) {
    return this.casesService.listDocuments(tenantId, caseId, query);
  }

  @Post(":caseId/documents")
  @Permissions("cases:read", "documents:write")
  @UseGuards(CaseDocumentUploadRateLimitGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: maxCaseDocumentSizeBytes }
    })
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateCaseDocumentBodyDto })
  @ApiCreatedResponse({ type: CaseDocumentDto })
  createDocument(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateCaseDocumentBodyDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  ) {
    return this.casesService.createDocument(
      tenantId,
      caseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      body,
      file
    );
  }

  @Get(":caseId/documents/:documentId/preview")
  @Permissions("cases:read", "documents:read")
  async previewDocument(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("documentId") documentId: string,
    @Res({ passthrough: true })
    response: {
      setHeader: (name: string, value: string | number) => void;
    }
  ) {
    const { document, object } = await this.casesService.readDocumentObject(
      tenantId,
      caseId,
      documentId
    );

    response.setHeader("Content-Type", object.contentType ?? document.mimeType);
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader(
      "Content-Disposition",
      `${isPreviewableDocumentMimeType(document.mimeType) ? "inline" : "attachment"}; filename="${toDownloadFilename(document.originalName)}"`
    );

    return new StreamableFile(object.body);
  }

  @Get(":caseId/documents/:documentId/download")
  @Permissions("cases:read", "documents:read")
  async downloadDocument(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("documentId") documentId: string,
    @Res({ passthrough: true })
    response: {
      setHeader: (name: string, value: string | number) => void;
    }
  ) {
    const { document, object } = await this.casesService.readDocumentObject(
      tenantId,
      caseId,
      documentId
    );

    response.setHeader("Content-Type", object.contentType ?? document.mimeType);
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${toDownloadFilename(document.originalName)}"`
    );

    return new StreamableFile(object.body);
  }

  @Delete(":caseId/documents/:documentId")
  @Permissions("cases:read", "documents:write")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  deleteDocument(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("documentId") documentId: string
  ) {
    return this.casesService.deleteDocument(tenantId, caseId, documentId);
  }

  @Get(":caseId/hearings")
  @Permissions("cases:read", "hearings:read")
  @ApiOkResponse({ type: CaseHearingsListResponseDto })
  listHearings(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Query() query: ListCaseHearingsQueryDto
  ) {
    return this.casesService.listHearings(tenantId, caseId, query);
  }

  @Post(":caseId/hearings")
  @Permissions("cases:read", "hearings:create")
  @ApiCreatedResponse({ type: CaseHearingDto })
  createHearing(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Body() input: CreateCaseHearingDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.createHearing(
      tenantId,
      caseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Patch(":caseId/hearings/:hearingId")
  @Permissions("cases:read", "hearings:update")
  @ApiOkResponse({ type: CaseHearingDto })
  updateHearing(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("hearingId") hearingId: string,
    @Body() input: UpdateCaseHearingDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.updateHearing(
      tenantId,
      caseId,
      hearingId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Delete(":caseId/hearings/:hearingId")
  @Permissions("cases:read", "hearings:delete")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  deleteHearing(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("hearingId") hearingId: string
  ) {
    return this.casesService.deleteHearing(tenantId, caseId, hearingId);
  }

  @Get(":caseId/expenses/summary")
  @Permissions("cases:read", "expenses:read")
  @ApiOkResponse({ type: CaseExpensesSummaryDto })
  getExpensesSummary(@ActiveTenant() tenantId: string, @Param("caseId") caseId: string) {
    return this.casesService.getExpensesSummary(tenantId, caseId);
  }

  @Post(":caseId/expenses/recalculate-overdue")
  @HttpCode(200)
  @Permissions("cases:read", "expenses:update")
  @ApiOkResponse({ type: CaseExpensesOverdueRecalculationDto })
  recalculateOverdueExpenses(@ActiveTenant() tenantId: string, @Param("caseId") caseId: string) {
    return this.casesService.recalculateOverdueExpenses(tenantId, caseId);
  }

  @Get(":caseId/expenses")
  @Permissions("cases:read", "expenses:read")
  @ApiOkResponse({ type: CaseExpensesListResponseDto })
  listExpenses(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Query() query: ListCaseExpensesQueryDto
  ) {
    return this.casesService.listExpenses(tenantId, caseId, query);
  }

  @Get(":caseId/expenses/:expenseId")
  @Permissions("cases:read", "expenses:read")
  @ApiOkResponse({ type: CaseExpenseDto })
  getExpense(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string
  ) {
    return this.casesService.getExpense(tenantId, caseId, expenseId);
  }

  @Post(":caseId/expenses")
  @Permissions("cases:read", "expenses:create")
  @ApiCreatedResponse({ type: CaseExpenseDto })
  createExpense(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Body() input: CreateCaseExpenseDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.createExpense(
      tenantId,
      caseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Patch(":caseId/expenses/:expenseId")
  @Permissions("cases:read", "expenses:update")
  @ApiOkResponse({ type: CaseExpenseDto })
  updateExpense(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string,
    @Body() input: UpdateCaseExpenseDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.casesService.updateExpense(
      tenantId,
      caseId,
      expenseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Delete(":caseId/expenses/:expenseId")
  @Permissions("cases:read", "expenses:delete")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  deleteExpense(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string
  ) {
    return this.casesService.deleteExpense(tenantId, caseId, expenseId);
  }

  @Get(":caseId/expenses/:expenseId/attachments")
  @Permissions("cases:read", "expenses:read")
  @ApiOkResponse({ type: CaseExpenseAttachmentsListResponseDto })
  listExpenseAttachments(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string,
    @Query() query: ListCaseExpenseAttachmentsQueryDto
  ) {
    return this.casesService.listExpenseAttachments(tenantId, caseId, expenseId, query);
  }

  @Post(":caseId/expenses/:expenseId/attachments")
  @Permissions("cases:read", "expenses:update")
  @UseGuards(CaseExpenseAttachmentUploadRateLimitGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: maxCaseExpenseAttachmentSizeBytes }
    })
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary"
        }
      },
      required: ["file"]
    }
  })
  @ApiCreatedResponse({ type: CaseExpenseAttachmentDto })
  createExpenseAttachment(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  ) {
    return this.casesService.createExpenseAttachment(
      tenantId,
      caseId,
      expenseId,
      request.user?.sub ?? missingAuthenticatedUser(),
      file
    );
  }

  @Get(":caseId/expenses/:expenseId/attachments/:attachmentId/download")
  @Permissions("cases:read", "expenses:read")
  async downloadExpenseAttachment(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string,
    @Param("attachmentId") attachmentId: string,
    @Res({ passthrough: true })
    response: {
      setHeader: (name: string, value: string | number) => void;
    }
  ) {
    const { attachment, object } = await this.casesService.downloadExpenseAttachment(
      tenantId,
      caseId,
      expenseId,
      attachmentId
    );

    response.setHeader("Content-Type", object.contentType ?? attachment.mimeType);
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${toDownloadFilename(attachment.originalName)}"`
    );

    return new StreamableFile(object.body);
  }

  @Delete(":caseId/expenses/:expenseId/attachments/:attachmentId")
  @Permissions("cases:read", "expenses:update")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  deleteExpenseAttachment(
    @ActiveTenant() tenantId: string,
    @Param("caseId") caseId: string,
    @Param("expenseId") expenseId: string,
    @Param("attachmentId") attachmentId: string
  ) {
    return this.casesService.deleteExpenseAttachment(tenantId, caseId, expenseId, attachmentId);
  }

  @Patch(":id")
  @Permissions("cases:update")
  @ApiOkResponse({ type: CaseDto })
  update(
    @ActiveTenant() tenantId: string,
    @Param("id") caseId: string,
    @Body() input: UpdateCaseDto
  ) {
    return this.casesService.update(tenantId, caseId, input);
  }

  @Delete(":id")
  @Permissions("cases:delete")
  @ApiOkResponse({ type: CaseDeleteResponseDto })
  delete(@ActiveTenant() tenantId: string, @Param("id") caseId: string) {
    return this.casesService.delete(tenantId, caseId);
  }
}

function toDownloadFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

function missingAuthenticatedUser(): never {
  throw new BadRequestException("No se pudo identificar al usuario autenticado.");
}

function getTenantPermissions(request: AuthenticatedRequest, tenantId: string) {
  return new Set(
    request.user?.tenantAccess.find((tenantAccess) => tenantAccess.tenantId === tenantId)
      ?.permissions ?? []
  );
}
