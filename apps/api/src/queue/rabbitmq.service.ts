import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import {
  documentCleanupQueueName,
  documentCleanupRoutingKey,
  notificationQueueName,
  notificationReminderRoutingKey,
  rabbitExchangeName
} from "./queue.constants";
import type { QueuePayload } from "./queue.types";

type MessageHandler<TPayload extends QueuePayload> = (payload: TPayload) => Promise<void>;

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private channel: Channel | null = null;
  private connection: ChannelModel | null = null;
  private connecting: Promise<Channel> | null = null;

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  async publishDelayed(routingKey: string, payload: QueuePayload, delayMs = 0) {
    const channel = await this.getChannel();
    const body = Buffer.from(JSON.stringify(payload));
    const published = channel.publish(rabbitExchangeName, routingKey, body, {
      contentType: "application/json",
      deliveryMode: 2,
      headers: delayMs > 0 ? { "x-delay": delayMs } : undefined
    });

    if (!published) {
      await new Promise<void>((resolve) => channel.once("drain", resolve));
    }
  }

  async consume<TPayload extends QueuePayload>(
    queueName: string,
    routingKey: string,
    handler: MessageHandler<TPayload>
  ) {
    const channel = await this.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, rabbitExchangeName, routingKey);
    await channel.prefetch(getPrefetchCount());
    await channel.consume(queueName, async (message) => {
      if (!message) {
        return;
      }

      try {
        const payload = JSON.parse(message.content.toString("utf8")) as TPayload;
        await handler(payload);
        channel.ack(message);
      } catch (error) {
        this.logger.error(`RabbitMQ handler failed for ${routingKey}.`, error);
        channel.nack(message, false, false);
      }
    });
  }

  async bindDefaultQueues() {
    const channel = await this.getChannel();
    await channel.assertQueue(notificationQueueName, { durable: true });
    await channel.assertQueue(documentCleanupQueueName, { durable: true });
    await channel.bindQueue(
      notificationQueueName,
      rabbitExchangeName,
      notificationReminderRoutingKey
    );
    await channel.bindQueue(
      documentCleanupQueueName,
      rabbitExchangeName,
      documentCleanupRoutingKey
    );
  }

  private async getChannel() {
    if (this.channel) {
      return this.channel;
    }

    if (!this.connecting) {
      this.connecting = this.connect();
    }

    try {
      this.channel = await this.connecting;
      return this.channel;
    } finally {
      this.connecting = null;
    }
  }

  private async connect() {
    const url = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    connection.on("close", () => this.resetConnection("RabbitMQ connection closed."));
    connection.on("error", (error) => this.resetConnection("RabbitMQ connection failed.", error));
    channel.on("close", () => this.resetConnection("RabbitMQ channel closed."));
    channel.on("error", (error) => this.resetConnection("RabbitMQ channel failed.", error));

    await channel.assertExchange(rabbitExchangeName, "x-delayed-message", {
      durable: true,
      arguments: { "x-delayed-type": "direct" }
    });

    this.connection = connection;
    this.logger.log(`Connected to RabbitMQ exchange ${rabbitExchangeName}.`);
    return channel;
  }

  private resetConnection(message: string, error?: unknown) {
    if (error) {
      this.logger.error(message, error);
    } else {
      this.logger.warn(message);
    }
    this.channel = null;
    this.connection = null;
    this.connecting = null;
  }
}

export function getDelayMsFromPayload(payload: QueuePayload) {
  if (!payload.deliverAt || typeof payload.deliverAt !== "string") {
    return 0;
  }

  const deliverAt = new Date(payload.deliverAt).getTime();
  if (Number.isNaN(deliverAt)) {
    return 0;
  }

  return Math.max(0, deliverAt - Date.now());
}

export function shouldUseRabbitMq() {
  return process.env.RABBITMQ_ENABLED === "true" || Boolean(process.env.RABBITMQ_URL);
}

function getPrefetchCount() {
  const value = Number(process.env.RABBITMQ_PREFETCH);
  return Number.isFinite(value) && value > 0 ? value : 10;
}
