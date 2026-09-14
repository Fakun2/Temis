import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../auth/permissions.guard";
import { IntegrationsModule } from "../integrations/integrations.module";
import { DatabaseModule } from "../database/database.module";
import { DocumentsModule } from "../documents/documents.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StorageModule } from "../storage/storage.module";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import { DocumentCategoriesController } from "./document-categories.controller";
import { CaseDocumentUploadRateLimitGuard } from "./guards/case-document-upload-rate-limit.guard";
import { CaseExpenseAttachmentUploadRateLimitGuard } from "./guards/case-expense-attachment-upload-rate-limit.guard";
import { ExpenseOverdueScheduler } from "./jobs/expense-overdue.scheduler";
import { CaseDocumentsUseCase } from "./use-cases/case-documents.use-case";
import { CaseExpenseAttachmentsUseCase } from "./use-cases/case-expense-attachments.use-case";
import { CaseExpenseCashboxSyncUseCase } from "./use-cases/case-expense-cashbox-sync.use-case";
import { CaseExpensesUseCase } from "./use-cases/case-expenses.use-case";
import { CaseHearingsUseCase } from "./use-cases/case-hearings.use-case";
import { CaseTasksUseCase } from "./use-cases/case-tasks.use-case";
import { ExpenseOverdueUseCase } from "./use-cases/expense-overdue.use-case";

@Module({
  imports: [DatabaseModule, StorageModule, DocumentsModule, NotificationsModule, IntegrationsModule],
  controllers: [CasesController, DocumentCategoriesController],
  providers: [
    CasesService,
    CaseExpenseAttachmentsUseCase,
    CaseDocumentsUseCase,
    CaseExpenseCashboxSyncUseCase,
    CaseExpensesUseCase,
    ExpenseOverdueUseCase,
    CaseHearingsUseCase,
    CaseTasksUseCase,
    ExpenseOverdueScheduler,
    CaseDocumentUploadRateLimitGuard,
    CaseExpenseAttachmentUploadRateLimitGuard,
    PermissionsGuard
  ]
})
export class CasesModule {}
