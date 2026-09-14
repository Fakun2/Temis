import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { QueueModule } from "../queue/queue.module";
import { IntegrationsController } from "./integrations.controller";
import { GoogleCalendarClientService } from "./google-calendar-client.service";
import { GoogleCalendarController } from "./google-calendar.controller";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleCalendarTokenService } from "./google-calendar-token.service";
import { SaeImportService } from "./sae-import.service";
import { SaeTucumanImportStrategy } from "./sae-tucuman-import.strategy";

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [IntegrationsController, GoogleCalendarController],
  providers: [GoogleCalendarClientService, GoogleCalendarService, GoogleCalendarTokenService, SaeImportService, SaeTucumanImportStrategy],
  exports: [GoogleCalendarService]
})
export class IntegrationsModule {}
