import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { NotionClientService } from "./notion-client.service";
import { NotionIntegrationController } from "./notion-integration.controller";
import { NotionIntegrationService } from "./notion-integration.service";
import { NotionSyncScheduler } from "./notion-sync.scheduler";
import { NotionTokenService } from "./notion-token.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotionIntegrationController],
  providers: [NotionClientService, NotionIntegrationService, NotionSyncScheduler, NotionTokenService],
  exports: [NotionIntegrationService]
})
export class NotionIntegrationModule {}
