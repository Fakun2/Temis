import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../auth/permissions.guard";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsScheduler } from "./notifications.scheduler";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler, PermissionsGuard],
  exports: [NotificationsService]
})
export class NotificationsModule {}
