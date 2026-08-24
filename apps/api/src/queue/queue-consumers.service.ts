import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DocumentsService } from "../documents/documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  documentCleanupQueueName,
  documentCleanupRoutingKey,
  notificationQueueName,
  notificationReminderRoutingKey
} from "./queue.constants";
import { RabbitMqService, shouldUseRabbitMq } from "./rabbitmq.service";
import type { DocumentCleanupRunMessage, NotificationReminderDueMessage } from "./queue.types";

@Injectable()
export class QueueConsumersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumersService.name);
  private cleanupRecoveryTimer: NodeJS.Timeout | null = null;
  private consumerRetryTimer: NodeJS.Timeout | null = null;
  private consumersStarted = false;

  constructor(
    private readonly documents: DocumentsService,
    private readonly notifications: NotificationsService,
    private readonly rabbitMq: RabbitMqService
  ) {}

  async onModuleInit() {
    if (!shouldUseRabbitMq()) {
      this.logger.log("RabbitMQ consumers disabled.");
      return;
    }

    await this.startConsumers();
  }

  onModuleDestroy() {
    if (this.cleanupRecoveryTimer) {
      clearTimeout(this.cleanupRecoveryTimer);
      this.cleanupRecoveryTimer = null;
    }
    if (this.consumerRetryTimer) {
      clearTimeout(this.consumerRetryTimer);
      this.consumerRetryTimer = null;
    }
  }

  private async startConsumers() {
    if (this.consumersStarted) {
      return;
    }

    try {
      await this.bindConsumers();
      this.consumersStarted = true;
      this.logger.log("RabbitMQ consumers started.");
      this.scheduleCleanupRecovery();
    } catch (error) {
      this.logger.error("RabbitMQ consumers failed to start. Retrying soon.", error);
      this.scheduleConsumerRetry();
    }
  }

  private async bindConsumers() {
    await this.rabbitMq.consume<NotificationReminderDueMessage>(
      notificationQueueName,
      notificationReminderRoutingKey,
      async (payload) => {
        await this.notifications.processReminderMessage(payload);
      }
    );
    await this.rabbitMq.consume<DocumentCleanupRunMessage>(
      documentCleanupQueueName,
      documentCleanupRoutingKey,
      async (payload) => {
        await this.documents.processCleanupJobMessage(payload);
      }
    );
  }

  private scheduleConsumerRetry() {
    if (this.consumerRetryTimer) {
      clearTimeout(this.consumerRetryTimer);
    }

    const intervalMs = getPositiveEnvNumber("RABBITMQ_CONSUMER_RETRY_INTERVAL_MS", 5_000);
    this.consumerRetryTimer = setTimeout(() => void this.startConsumers(), intervalMs);
    this.consumerRetryTimer.unref?.();
  }

  private scheduleCleanupRecovery() {
    const intervalMs = getPositiveEnvNumber("DOCUMENT_CLEANUP_RECOVERY_INTERVAL_MS", 10 * 60_000);
    this.cleanupRecoveryTimer = setTimeout(() => void this.runCleanupRecovery(), intervalMs);
    this.cleanupRecoveryTimer.unref?.();
  }

  private async runCleanupRecovery() {
    try {
      await this.documents.recoverStaleCleanupJobs();
    } catch (error) {
      this.logger.error("Document cleanup recovery failed.", error);
    } finally {
      this.scheduleCleanupRecovery();
    }
  }
}

function getPositiveEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
