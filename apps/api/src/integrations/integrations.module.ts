import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { IntegrationsController } from "./integrations.controller";
import { SaeImportService } from "./sae-import.service";
import { SaeTucumanImportStrategy } from "./sae-tucuman-import.strategy";

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrationsController],
  providers: [SaeImportService, SaeTucumanImportStrategy]
})
export class IntegrationsModule {}
