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
let isShuttingDown = false;

async function bootstrap() {
  await prisma.$connect();
  startConsumersSupervisor();

  if (getBooleanEnv("ASYNC_OUTBOX_PUBLISHER_ENABLED", true)) {
    publisher.start();
  }

  documentCleanup.startRecoveryLoop();
  logger.info("BogApp lightweight worker started.");
}

function startConsumersSupervisor() {
  void superviseConsumers();
}

async function superviseConsumers() {
  const retryIntervalMs = getPositiveNumberEnv("RABBITMQ_CONSUMER_RETRY_INTERVAL_MS", 5_000);

  while (!isShuttingDown) {
    const disconnectWaiter = rabbitMq.waitForDisconnect();

    try {
      await registerConsumers();
      logger.info("RabbitMQ consumers are active.");
      await disconnectWaiter.promise;

      if (!isShuttingDown) {
        logger.warn("RabbitMQ consumers disconnected. Reconnecting soon.");
      }
    } catch (error) {
      if (!isShuttingDown) {
        logger.error("RabbitMQ consumers failed. Retrying soon.", error);
      }
    } finally {
      disconnectWaiter.dispose();
    }

    if (!isShuttingDown) {
      await sleep(retryIntervalMs);
    }
  }
}

async function registerConsumers() {
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
}

async function shutdown() {
  isShuttingDown = true;
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
