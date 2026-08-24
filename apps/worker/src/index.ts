import { PrismaClient } from "@prisma/client";
import { getBooleanEnv, getPositiveNumberEnv, loadEnv } from "./config";
import { DocumentCleanupWorker } from "./documents/document-cleanup-worker";
import { createLogger } from "./logger";
import { NotificationsWorker } from "./notifications/notifications-worker";
import {
  documentCleanupQueueName,
  documentCleanupRoutingKey,
  notificationQueueName,
  notificationReminderRoutingKey
} from "./queue/constants";
import { AsyncOutbox } from "./queue/outbox";
import { AsyncOutboxPublisher } from "./queue/publisher";
import { RabbitMq } from "./queue/rabbitmq";
import { sleep } from "./queue/retry";
import type { DocumentCleanupRunMessage, NotificationReminderDueMessage } from "./queue/types";
import { ObjectStorage } from "./storage/object-storage";

loadEnv();

const logger = createLogger("Worker");
const prisma = new PrismaClient();
const rabbitMq = new RabbitMq();
const outbox = new AsyncOutbox(prisma);
const notifications = new NotificationsWorker(prisma, outbox);
const documentCleanup = new DocumentCleanupWorker(prisma, outbox, new ObjectStorage());
const publisher = new AsyncOutboxPublisher(outbox, rabbitMq);

async function bootstrap() {
  await prisma.$connect();
  await startConsumersWithRetry();

  if (getBooleanEnv("ASYNC_OUTBOX_PUBLISHER_ENABLED", true)) {
    publisher.start();
  }

  documentCleanup.startRecoveryLoop();
  logger.info("BogApp lightweight worker started.");
}

async function startConsumersWithRetry() {
  const retryIntervalMs = getPositiveNumberEnv("RABBITMQ_CONSUMER_RETRY_INTERVAL_MS", 5_000);

  while (true) {
    try {
      await rabbitMq.bindDefaultQueues();
      await rabbitMq.consume<NotificationReminderDueMessage>(
        notificationQueueName,
        notificationReminderRoutingKey,
        async (payload) => {
          await notifications.processReminderMessage(payload);
        }
      );
      await rabbitMq.consume<DocumentCleanupRunMessage>(
        documentCleanupQueueName,
        documentCleanupRoutingKey,
        async (payload) => {
          await documentCleanup.processCleanupJobMessage(payload);
        }
      );
      return;
    } catch (error) {
      logger.error("RabbitMQ consumers failed to start. Retrying soon.", error);
      await sleep(retryIntervalMs);
    }
  }
}

async function shutdown() {
  logger.info("Stopping BogApp lightweight worker.");
  publisher.stop();
  await rabbitMq.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

void bootstrap().catch(async (error) => {
  logger.error("Worker bootstrap failed.", error);
  await rabbitMq.close();
  await prisma.$disconnect();
  process.exit(1);
});
