import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { outboxPublisherBatchSize, outboxPublisherIntervalMs } from "./queue.constants";
import { AsyncOutboxService } from "./async-outbox.service";
import { getDelayMsFromPayload, RabbitMqService, shouldUseRabbitMq } from "./rabbitmq.service";
import type { QueuePayload } from "./queue.types";

@Injectable()
export class AsyncOutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsyncOutboxPublisher.name);
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outbox: AsyncOutboxService,
    private readonly rabbitMq: RabbitMqService
  ) {}

  onModuleInit() {
    if (process.env.ASYNC_OUTBOX_PUBLISHER_ENABLED !== "true" || !shouldUseRabbitMq()) {
      this.logger.log("Async outbox publisher disabled.");
      return;
    }

    this.scheduleNextRun(1_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun(delayMs = outboxPublisherIntervalMs) {
    this.timer = setTimeout(() => void this.run(), delayMs);
    this.timer.unref?.();
  }

  private async run() {
    if (this.isRunning) {
      this.scheduleNextRun();
      return;
    }

    this.isRunning = true;

    try {
      const events = await this.outbox.claimDue(outboxPublisherBatchSize);
      for (const event of events) {
        try {
          const payload = event.payload as QueuePayload;
          await this.rabbitMq.publishDelayed(
            event.routing_key,
            payload,
            getDelayMsFromPayload(payload)
          );
          await this.outbox.markPublished(event.id);
        } catch (error) {
          this.logger.error(`Failed to publish outbox event ${event.id}.`, error);
          await this.outbox.markFailed(event.id, error);
        }
      }
    } catch (error) {
      this.logger.error("Async outbox publisher failed.", error);
    } finally {
      this.isRunning = false;
      this.scheduleNextRun();
    }
  }
}
