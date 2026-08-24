import { createLogger } from "../logger";
import { outboxPublisherBatchSize, outboxPublisherIntervalMs } from "./constants";
import { getDelayMsFromPayload, AsyncOutbox } from "./outbox";
import { RabbitMq } from "./rabbitmq";
import type { QueuePayload } from "./types";

export class AsyncOutboxPublisher {
  private readonly logger = createLogger("AsyncOutboxPublisher");
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outbox: AsyncOutbox,
    private readonly rabbitMq: RabbitMq
  ) {}

  start() {
    this.scheduleNextRun(1_000);
  }

  stop() {
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
