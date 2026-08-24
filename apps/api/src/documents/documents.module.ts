import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../auth/permissions.guard";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { StorageModule } from "../storage/storage.module";
import { CaseDocumentUploadRateLimitGuard } from "../cases/guards/case-document-upload-rate-limit.guard";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [DatabaseModule, QueueModule, StorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, CaseDocumentUploadRateLimitGuard, PermissionsGuard],
  exports: [DocumentsService]
})
export class DocumentsModule {}
