import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

const defaultIntervalMs = 60_000;
const defaultBatchSize = 100;

@Injectable()
export class NotificationsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsScheduler.name);
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly notificationsService: NotificationsService) {}

  onModuleInit() {
    if (process.env.NOTIFICATIONS_SCHEDULER_ENABLED === "false") {
      this.logger.log("Notification reminder scheduler disabled.");
      return;
    }

    this.scheduleNextRun();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun() {
    const intervalMs = getPositiveEnvNumber(
      "NOTIFICATIONS_SCHEDULER_INTERVAL_MS",
      defaultIntervalMs
    );
    this.timer = setTimeout(() => {
      void this.run();
    }, intervalMs);
    this.timer.unref?.();
  }

  private async run() {
    if (this.isRunning) {
      this.scheduleNextRun();
      return;
    }

    this.isRunning = true;

    try {
      const batchSize = getPositiveEnvNumber(
        "NOTIFICATIONS_SCHEDULER_BATCH_SIZE",
        defaultBatchSize
      );
      const result = await this.notificationsService.processDueReminders(batchSize);
      if (result.processedCount > 0) {
        this.logger.log(`Delivered notification reminders: ${result.processedCount}.`);
      }
    } catch (error) {
      this.logger.error("Notification reminder processing failed.", error);
    } finally {
      this.isRunning = false;
      this.scheduleNextRun();
    }
  }
}

function getPositiveEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
