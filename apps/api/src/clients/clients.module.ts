import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../auth/permissions.guard";
import { DatabaseModule } from "../database/database.module";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ClientsController],
  providers: [ClientsService, PermissionsGuard]
})
export class ClientsModule {}
