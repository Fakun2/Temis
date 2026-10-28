import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { StorageModule } from "../storage/storage.module";
import { HealthController } from "./health.controller";
import { PublicHealthService } from "./public-health.service";

@Module({
  imports: [QueueModule, StorageModule],
  controllers: [HealthController],
  providers: [PublicHealthService]
})
export class HealthModule {}
