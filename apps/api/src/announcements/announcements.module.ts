import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AnnouncementsController } from "./announcements.controller";
import { AnnouncementsService } from "./announcements.service";
import { StorageModule } from "../storage/storage.module";
import { NewslettersController } from "./newsletters.controller";
import { NewslettersService } from "./newsletters.service";
@Module({ imports:[AuthModule,DatabaseModule,TenancyModule,StorageModule], controllers:[AnnouncementsController,NewslettersController], providers:[AnnouncementsService,NewslettersService] }) export class AnnouncementsModule {}
