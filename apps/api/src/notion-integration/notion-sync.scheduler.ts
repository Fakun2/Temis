import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NotionIntegrationService } from "./notion-integration.service";

@Injectable()
export class NotionSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotionSyncScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly notionIntegration: NotionIntegrationService) {}

  onModuleInit() {
    if (process.env.NOTION_SYNC_SCHEDULER_ENABLED === "false") {
      return;
    }

    this.timer = setInterval(() => void this.tick(), getIntervalMs());
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      await this.notionIntegration.runDueSync();
    } catch (error) {
      this.logger.error("No se pudo ejecutar la sincronizacion programada de Notion.", error);
    } finally {
      this.running = false;
    }
  }
}

function getIntervalMs() {
  const value = Number(process.env.NOTION_SYNC_SCHEDULER_INTERVAL_MS ?? 60_000);

  return Number.isFinite(value) && value > 0 ? value : 60_000;
}
