import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { RedisModule } from "../redis/redis.module";
import { PlatformController } from "./platform.controller";
import { PlatformGuard } from "./platform.guard";
import { PlatformService } from "./platform.service";
import { PlatformObservabilitySampler } from "./platform-observability.sampler";
import { AuthModule } from "../auth/auth.module";
import { PlatformAnnouncementsController } from "./platform-announcements.controller";
import { PlatformAnnouncementsService } from "./platform-announcements.service";
import { PlatformObservabilityService } from "./platform-observability.service";
import { StorageModule } from "../storage/storage.module";
import { PlatformNewslettersController } from "./platform-newsletters.controller";
import { PlatformNewslettersService } from "./platform-newsletters.service";

@Module({
  imports: [AuthModule, DatabaseModule, QueueModule, RedisModule, StorageModule],
  controllers: [PlatformController, PlatformAnnouncementsController, PlatformNewslettersController],
  providers: [
    PlatformAnnouncementsService,
    PlatformNewslettersService,
    PlatformGuard,
    PlatformObservabilitySampler,
    PlatformObservabilityService,
    PlatformService
  ]
})
export class PlatformModule {}
